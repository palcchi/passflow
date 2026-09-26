import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import {
  buildFigmaAuthorizationUrl,
  createFigmaPkce,
  createFigmaState,
  getFigmaConfig,
} from "@/lib/figma";

export const runtime = "nodejs";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://passflow.my.id").replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const context = await getAuthContext();
  const eventId = request.nextUrl.searchParams.get("eventId");

  if (!context) {
    const next = eventId ? `/admin/events/${eventId}/design` : "/admin";
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, appUrl()));
  }

  if (!eventId) return NextResponse.redirect(new URL("/admin?figma=missing_event", appUrl()));

  const { data: allowed } = await context.supabase.rpc("is_event_manager", {
    p_event_id: eventId,
  });
  if (!allowed) return NextResponse.redirect(new URL("/unauthorized", appUrl()));

  if (!getFigmaConfig()) {
    return NextResponse.redirect(
      new URL(`/admin/events/${eventId}/design?figma=not_configured`, appUrl()),
    );
  }

  const state = createFigmaState();
  const { verifier, challenge } = createFigmaPkce();
  const payload = Buffer.from(JSON.stringify({ state, verifier, eventId })).toString("base64url");
  const response = NextResponse.redirect(buildFigmaAuthorizationUrl(state, challenge));

  response.cookies.set("pf_figma_oauth", payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  return response;
}
