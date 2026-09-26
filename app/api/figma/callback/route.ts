import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import { encryptFigmaToken, exchangeFigmaCode, figmaFetch, verifyFigmaState } from "@/lib/figma";

type FigmaMe = { id: string; handle?: string; email?: string; img_url?: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const context = await getAuthContext();
  if (!context) {
    console.warn("Figma OAuth callback: PassFlow session unavailable", {
      hasStateCookie: Boolean(cookieStore.get("passflow_figma_state")?.value),
      hasSupabaseCookie: cookieStore.getAll().some(cookie => cookie.name.startsWith("sb-")),
    });
    return NextResponse.redirect(new URL("/login?error=figma-session&next=%2Fprofile", request.url));
  }
  const { supabase, user } = context;
  const requestedNext = cookieStore.get("passflow_figma_next")?.value;
  const next = requestedNext && /^\/admin\/events\/[a-zA-Z0-9_-]+\/design$/.test(requestedNext) ? requestedNext : "/profile";
  const go = (status: string) => {
    const destination = new URL(next, request.url);
    destination.searchParams.set("figma", status);
    const response = NextResponse.redirect(destination);
    response.cookies.delete("passflow_figma_state");
    response.cookies.delete("passflow_figma_next");
    return response;
  };
  const error = url.searchParams.get("error");
  if (error) {
    console.warn("Figma OAuth callback: authorization denied");
    return go("cancelled");
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    console.warn("Figma OAuth callback: code or state missing");
    return go("missing-code");
  }
  if (cookieStore.get("passflow_figma_state")?.value !== state || !verifyFigmaState(state, user.id)) {
    console.warn("Figma OAuth callback: state mismatch");
    return go("invalid-state");
  }
  let stage = "token";
  try {
    const tokens = await exchangeFigmaCode(code);
    if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) throw new Error("Incomplete token response");
    stage = "profile";
    const profile = await figmaFetch<FigmaMe>(tokens.access_token, "/me");
    if (!profile.id) throw new Error("Missing Figma user");
    stage = "database";
    const { error: saveError } = await supabase.from("figma_connections").upsert({
      user_id: user.id, figma_user_id: profile.id, handle: profile.handle ?? null,
      email: profile.email ?? null, avatar_url: profile.img_url ?? null,
      access_token_encrypted: encryptFigmaToken(tokens.access_token),
      refresh_token_encrypted: encryptFigmaToken(tokens.refresh_token),
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: ["current_user:read", "file_content:read"],
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (saveError) throw saveError;
    return go("connected");
  } catch (error) {
    console.error("Figma OAuth callback failed", { stage, code: error && typeof error === "object" && "code" in error ? String(error.code) : undefined });
    return go(`${stage}-error`);
  }
}
