import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { figmaAuthorizeUrl, figmaConfigured, figmaState } from "@/lib/figma";

export async function GET(request: Request) {
  const { user } = await requireUser("/profile");
  const requestedNext = new URL(request.url).searchParams.get("next");
  const next = requestedNext && /^\/admin\/events\/[a-zA-Z0-9_-]+\/design$/.test(requestedNext) ? requestedNext : "/profile";
  if (!figmaConfigured()) {
    console.warn("Figma OAuth connect: server configuration missing");
    return NextResponse.redirect(new URL("/profile?figma=not-configured", request.url));
  }
  const state = figmaState(user.id, randomBytes(18).toString("hex"));
  const response = NextResponse.redirect(figmaAuthorizeUrl(state)!);
  response.cookies.set("passflow_figma_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  response.cookies.set("passflow_figma_next", next, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
