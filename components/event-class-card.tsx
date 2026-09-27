import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";
import { eventInk } from "@/lib/event-colors";
import { EventCoverArtwork as FlowCoverArtwork } from "@/components/flow-brand-art";
import { EventCoverArtwork } from "@/components/brand-art";

export function EventClassCard({ event, joined = false, manage = false, flow = false }: {
  event: PassFlowEvent; joined?: boolean; manage?: boolean; flow?: boolean;
}) {
  const CoverArtwork = flow || manage ? FlowCoverArtwork : EventCoverArtwork;
  const href = manage ? `/admin/events/${event.id}` : joined ? `/e/${event.slug}/claim` : `/e/${event.slug}`;
  return <Link href={href} className="class-event-card" style={{ "--card-brand": event.theme.primary, "--card-brand-ink": eventInk(event.theme.primary), "--card-secondary": event.theme.secondary } as CSSProperties}>
    <div className="class-event-cover">
      {event.heroImageUrl || event.posterUrl ? <Image src={(event.heroImageUrl || event.posterUrl)!} fill unoptimized sizes="(max-width: 680px) 90vw, (max-width: 1100px) 45vw, 360px" alt="" className="class-event-image"/> : <CoverArtwork name={event.name} color={event.theme.primary}/>}
      <span className="class-event-badge" data-state={manage ? event.status : joined ? "joined" : "open"}><i/>{manage ? event.status === "published" ? "Published" : "Draft" : joined ? "Terdaftar" : "Open event"}</span>
    </div>
    <div className="class-event-body">
      <h3>{event.name}</h3>
      {manage && <span className="flow-event-status" data-state={event.status}>{event.status || "draft"}</span>}
      <p><CalendarDays size={15}/>{event.dateLabel}</p>
      <p><MapPin size={15}/>{event.venue || "Lokasi segera diumumkan"}</p>
    </div>
    {manage && <div className="flow-event-progress"><span><b>{event.checkedInCount.toLocaleString("id-ID")}</b> / {event.attendeeCount.toLocaleString("id-ID")}</span><progress value={event.checkedInCount} max={Math.max(event.attendeeCount, event.checkedInCount, 1)} aria-label={`${event.name}: ${event.checkedInCount} dari ${event.attendeeCount} peserta check-in`}/><small>checked in</small></div>}
    <div className="class-event-footer"><span>{manage ? "Kelola event" : joined ? "Buka pass digital" : "Lihat detail"}</span><ArrowUpRight size={19}/></div>
  </Link>;
}
