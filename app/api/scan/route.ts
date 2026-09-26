import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";

export async function POST(request: Request) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ ok: false, reason: "forbidden" }, 403);
  const context = await getAuthContext();
  if (!context) return reply({ ok: false, reason: "unauthenticated" }, 401);
  const raw = await request.text();
  if (raw.length > 2048) return reply({ ok: false, reason: "invalid_request" }, 400);
  let body;
  try { body = JSON.parse(raw); } catch { return reply({ ok: false, reason: "invalid_request" }, 400); }
  if (typeof body?.station !== "string" || typeof body?.code !== "string") return reply({ ok: false, reason: "invalid_request" }, 400);
  const station = body.station.trim(), code = body.code.trim();
  if (!station || station.length > 100 || !code || code.length > 256) return reply({ ok: false, reason: "invalid_request" }, 400);
  let query = context.supabase.from("scanner_stations").select("id").eq("is_active", true);
  query = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(station) ? query.eq("id", station) : query.eq("slug", station);
  const { data: rows, error: lookupError } = await query.limit(2);
  if (lookupError || rows?.length !== 1) return reply({ ok: false, reason: "station_not_found" }, 404);
  const { data, error } = await context.supabase.rpc("validate_scan", { p_station_id: rows[0].id, p_code: code });
  if (error) return reply({ ok: false, reason: "validation_failed" }, 400);
  return reply(data);
}
