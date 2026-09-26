import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireOrganizer } from "@/lib/auth/session";
import { figmaAuthorizeUrl, figmaConfigured, figmaState } from "@/lib/figma";

export async function GET(request: Request) {
  const { user } = await requireOrganizer("/admin");
  if (!figmaConfigured()) return NextResponse.redirect(new URL("/admin?figma=not-configured", request.url));
  const state = figmaState(user.id, randomBytes(18).toString("hex"));
  const response = NextResponse.redirect(figmaAuthorizeUrl(state)!);
  response.cookies.set("passflow_figma_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
