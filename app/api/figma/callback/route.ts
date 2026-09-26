import { NextResponse } from "next/server";
import { requireOrganizer } from "@/lib/auth/session";
import { encryptFigmaToken, exchangeFigmaCode, figmaFetch, verifyFigmaState } from "@/lib/figma";

type FigmaMe = { id: string; handle?: string; email?: string; img_url?: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = "/admin?figma=connected";
  const error = url.searchParams.get("error");
  if (error) return NextResponse.redirect(new URL(`/admin?figma=error&reason=${encodeURIComponent(error)}`, request.url));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return NextResponse.redirect(new URL("/admin?figma=error&reason=missing_code", request.url));
  const { supabase, user } = await requireOrganizer(next);
  const storedState = (await import("next/headers")).cookies;
  const cookieStore = await storedState();
  if (cookieStore.get("passflow_figma_state")?.value !== state || !verifyFigmaState(state, user.id)) return NextResponse.redirect(new URL("/admin?figma=error&reason=invalid_state", request.url));
  try {
    const tokens = await exchangeFigmaCode(code);
    const profile = await figmaFetch<FigmaMe>(tokens.access_token, "/me");
    await supabase.from("figma_connections").upsert({ user_id: user.id, figma_user_id: profile.id, figma_email: profile.email ?? null, figma_name: profile.handle ?? null, access_token_encrypted: encryptFigmaToken(tokens.access_token), refresh_token_encrypted: tokens.refresh_token ? encryptFigmaToken(tokens.refresh_token) : null, expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null, scopes: (tokens.scope ?? "").split(" ").filter(Boolean), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    const response = NextResponse.redirect(new URL(next, request.url));
    response.cookies.delete("passflow_figma_state");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/admin?figma=error&reason=exchange_failed", request.url));
  }
}
