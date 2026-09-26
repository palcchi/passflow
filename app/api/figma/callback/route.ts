import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import {
  encryptFigmaSecret,
  exchangeFigmaCode,
  getFigmaConfig,
  getFigmaProfile,
  FIGMA_SCOPES,
} from "@/lib/figma";

export const runtime = "nodejs";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://passflow.my.id").replace(/\/$/, "");
}

function designUrl(eventId: string, state: string) {
  return new URL(`/admin/events/${eventId}/design?figma=${state}`, appUrl());
}

export async function GET(request: NextRequest) {
  const encoded = request.cookies.get("pf_figma_oauth")?.value;
  if (!encoded) return NextResponse.redirect(new URL("/admin?figma=expired", appUrl()));

  let payload: { state: string; verifier: string; eventId: string };
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as typeof payload;
  } catch {
    return NextResponse.redirect(new URL("/admin?figma=invalid_state", appUrl()));
  }

  const responseWithClearedCookie = (url: URL) => {
    const response = NextResponse.redirect(url);
    response.cookies.set("pf_figma_oauth", "", { maxAge: 0, path: "/" });
    return response;
  };

  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!state || state !== payload.state || !code) {
    return responseWithClearedCookie(designUrl(payload.eventId, "invalid_state"));
  }

  const context = await getAuthContext();
  if (!context) return responseWithClearedCookie(new URL("/login", appUrl()));
  if (!getFigmaConfig()) {
    return responseWithClearedCookie(designUrl(payload.eventId, "not_configured"));
  }

  const { data: allowed } = await context.supabase.rpc("is_event_manager", {
    p_event_id: payload.eventId,
  });
  if (!allowed) return responseWithClearedCookie(new URL("/unauthorized", appUrl()));

  try {
    const token = await exchangeFigmaCode(code, payload.verifier);
    const profile = await getFigmaProfile(token.access_token);

    if (!token.refresh_token) throw new Error("Figma did not return a refresh token.");

    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
    const { error } = await context.supabase.from("figma_connections").upsert({
      user_id: context.user.id,
      figma_user_id: token.user_id_string ?? profile.id,
      handle: profile.handle,
      email: profile.email ?? null,
      avatar_url: profile.img_url ?? null,
      access_token_encrypted: encryptFigmaSecret(token.access_token),
      refresh_token_encrypted: encryptFigmaSecret(token.refresh_token),
      expires_at: expiresAt,
      scopes: [...FIGMA_SCOPES],
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return responseWithClearedCookie(designUrl(payload.eventId, "connected"));
  } catch {
    return responseWithClearedCookie(designUrl(payload.eventId, "error"));
  }
}
