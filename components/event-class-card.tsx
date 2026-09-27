import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";
import { eventInk } from "@/lib/event-colors";

export function EventClassCard({ event, joined = false, manage = false }: {
  event: PassFlowEvent; joined?: boolean; manage?: boolean;
}) {
  const href = manage ? `/admin/events/${event.id}` : joined ? `/e/${event.slug}/claim` : `/e/${event.slug}`;
  return <Link href={href} className="class-event-card" style={{ "--card-brand": event.theme.primary, "--card-brand-ink": eventInk(event.theme.primary), "--card-secondary": event.theme.secondary } as CSSProperties}>
    <div className="class-event-cover">
      {event.heroImageUrl || event.posterUrl ? <Image src={(event.heroImageUrl || event.posterUrl)!} fill unoptimized sizes="(max-width: 680px) 90vw, (max-width: 1100px) 45vw, 360px" alt="" className="class-event-image"/> : <div className="class-event-art" aria-hidden="true"><i/><i/><i/></div>}
      <span className="class-event-badge">{manage ? event.status === "published" ? "Published" : "Draft" : joined ? "Terdaftar" : "Jelajahi event"}</span>
    </div>
    <div className="class-event-body">
      <h3>{event.name}</h3>
      <p><CalendarDays size={15}/>{event.dateLabel}</p>
      <p><MapPin size={15}/>{event.venue || "Lokasi segera diumumkan"}</p>
    </div>
    <div className="class-event-footer"><span>{manage ? `${event.attendeeCount} peserta · ${event.checkedInCount} check-in` : joined ? "Buka pass digital" : "Lihat detail"}</span><ArrowUpRight size={19}/></div>
  </Link>;
}
