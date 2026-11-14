import { NextRequest, NextResponse } from "next/server";
import { hashNewPassword } from "@/lib/auth/password";
import { consumePasswordResetToken } from "@/lib/auth/local-tokens";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 4096) {
    return NextResponse.json({ ok: false }, { status: 413, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const body = await request.json() as { token?: unknown; password?: unknown };
    if (typeof body.token !== "string" || typeof body.password !== "string" ||
        body.password.length < 8 || body.password.length > 1024) {
      return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const passwordHash = await hashNewPassword(body.password);
    const ok = await consumePasswordResetToken(body.token, passwordHash);
    if (!ok) return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
