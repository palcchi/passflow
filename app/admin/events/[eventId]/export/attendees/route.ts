import { requireOrganizerMembership } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase } = await requireOrganizerMembership(`/admin/events/${eventId}`);
  const { data, error } = await supabase.from("attendees")
    .select("attendee_code,name,email,phone,ticket_type_id,checked_in_at,created_at")
    .eq("event_id", eventId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Export belum tersedia." }, { status: 500 });
  const ticketIds = [...new Set((data ?? []).map(row => row.ticket_type_id).filter((id): id is string => Boolean(id)))];
  const { data: tickets } = ticketIds.length ? await supabase.from("ticket_types").select("id,name").in("id", ticketIds) : { data: [] };
  const names = new Map((tickets ?? []).map(ticket => [ticket.id, ticket.name]));
  const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    ["attendee_code", "name", "email", "phone", "ticket", "checked_in_at", "created_at"],
    ...(data ?? []).map(row => [row.attendee_code, row.name, row.email, row.phone, row.ticket_type_id ? names.get(row.ticket_type_id) : "", row.checked_in_at, row.created_at]),
  ];
  const csv = "\ufeff" + rows.map(row => row.map(cell).join(",")).join("\r\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="passflow-attendees-${eventId}.csv"`, "Cache-Control": "private, no-store" } });
}
