import { NextResponse } from "next/server";
import { getPublishedEvent } from "@/lib/events";
import { getAppOrigin } from "@/lib/supabase/config";
import { icsEvent } from "@/lib/ics";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);
  if (!event?.startsAt || !event.endsAt) return new NextResponse("Event not found", { status: 404 });
  const url = `${getAppOrigin() ?? "https://passflow.my.id"}/e/${encodeURIComponent(event.slug)}`;
  const body = icsEvent({ uid: event.id, title: event.name, start: event.startsAt, end: event.endsAt, location: event.venue, description: event.description, url });
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug.replace(/[^a-z0-9-]/gi, "")}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
