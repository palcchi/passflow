import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { notifyPassflowAdmins } from "@/lib/notifications";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Request-Id": requestId } });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ ok: false, reason: "forbidden" }, 403);
  const context = await getAuthContext();
  if (!context) return reply({ ok: false, reason: "unauthenticated" }, 401);
  const raw = await request.text();
  if (raw.length > 2048) return reply({ ok: false, reason: "invalid_request" }, 400);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return reply({ ok: false, reason: "invalid_request" }, 400); }
  if (!body || Array.isArray(body) || typeof body.station !== "string") return reply({ ok: false, reason: "invalid_request" }, 400);
  const station = body.station.trim();
  if (!station || station.length > 100) return reply({ ok: false, reason: "invalid_request" }, 400);
  let query = context.supabase.from("scanner_stations").select("id,event_id,mode").eq("is_active", true);
  query = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(station) ? query.eq("id", station) : query.eq("slug", station);
  const { data: rows, error: lookupError } = await query.limit(2);
  if (lookupError || rows?.length !== 1) return reply({ ok: false, reason: "station_not_found" }, 404);
  const stationId = rows[0].id;
  const stationEventId = rows[0].event_id;
  const stationMode = rows[0].mode;
  let operation: "validate_scan" | "lookup_station_attendees" | "manual_station_check_in";
  let args: { p_station_id: string; p_code: string } |
    { p_station_id: string; p_query: string } |
    { p_station_id: string; p_attendee_id: string; p_reason: string };
  if (body.action === "lookup") {
    if (typeof body.query !== "string" || body.query.trim().length < 2 || body.query.length > 80)
      return reply({ ok: false, reason: "invalid_request" }, 400);
    operation = "lookup_station_attendees";
    args = { p_station_id: stationId, p_query: body.query.trim() };
  } else if (body.action === "manual") {
    if (typeof body.attendeeId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.attendeeId) ||
      typeof body.reason !== "string" || body.reason.trim().length < 8 || body.reason.length > 200)
      return reply({ ok: false, reason: "invalid_request" }, 400);
    operation = "manual_station_check_in";
    args = { p_station_id: stationId, p_attendee_id: body.attendeeId, p_reason: body.reason.trim() };
  } else {
    if (body.action !== undefined && body.action !== "scan" ||
      typeof body.code !== "string" || !body.code.trim() || body.code.length > 256)
      return reply({ ok: false, reason: "invalid_request" }, 400);
    operation = "validate_scan";
    args = { p_station_id: stationId, p_code: body.code.trim() };
  }
  const { data, error } = operation === "lookup_station_attendees"
    ? await context.supabase.rpc(operation, args as { p_station_id: string; p_query: string })
    : operation === "manual_station_check_in"
      ? await context.supabase.rpc(operation, args as { p_station_id: string; p_attendee_id: string; p_reason: string })
      : await context.supabase.rpc(operation, args as { p_station_id: string; p_code: string });
  if (error) {
    console.error("scan_rpc_failed", { requestId, operation, stationId, errorCode: error.code });
    return reply({ ok: false, reason: "validation_failed", requestId }, 503);
  }
  const result = data as { ok?: boolean; reason?: string; decision?: string; message?: string } | null;
  if (operation !== "lookup_station_attendees" && stationMode === "check_in" && result?.ok === true && result.decision === "granted") {
    // Only confirmed first-time check-ins trigger an alert; invalid scans and duplicate scans do not.
    const { data: event } = await context.supabase.from("events").select("name").eq("id", stationEventId).maybeSingle();
    if (event?.name) {
      void notifyPassflowAdmins({
        type: "successful_check_in",
        subject: `PassFlow: successful check-in — ${event.name}`,
        title: "Successful event check-in",
        body: `A check-in was recorded successfully for “${event.name}”. No attendee personal information or QR credential is included in this alert.`,
        href: "/organizer/events",
        whatsappText: `PassFlow admin alert: a successful check-in was recorded for “${event.name}”.`,
      }).catch(() => undefined);
    }
  }
  const status = result?.reason === "rate_limited" ? 429 : result?.reason === "forbidden" ? 403 : 200;
  return reply(data, status);
}
