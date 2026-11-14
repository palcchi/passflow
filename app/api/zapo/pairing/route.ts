import { timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenMatches(received: string, expected: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const received = url.searchParams.get("token") ?? "";
  const expected = process.env.ZAPO_PAIRING_VIEW_TOKEN ?? "";
  if (!expected || !tokenMatches(received, expected)) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }

  const baseUrl = process.env.ZAPO_BASE_URL ?? "http://127.0.0.1:2786";
  const apiKey = process.env.ZAPO_API_KEY ?? "";
  if (!apiKey) {
    return Response.json({ error: "Zapo gateway is not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const upstream = await fetch(new URL("/pairing", baseUrl), {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    const data = await upstream.json() as { qr?: string; error?: string; state?: string; paired?: boolean };
    if (!upstream.ok || !data.qr) {
      return Response.json(
        { error: data.error ?? "QR is not available", state: data.state, paired: data.paired },
        { status: upstream.status === 409 ? 409 : 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    const svg = await QRCode.toString(data.qr, {
      type: "svg",
      width: 440,
      margin: 3,
      errorCorrectionLevel: "M",
    });
    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return Response.json({ error: "Unable to reach the local Zapo gateway" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
