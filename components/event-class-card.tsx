import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";
import { eventInk } from "@/lib/event-colors";
import { AvatarCircles } from "@/components/magicui/avatar-circles";

export function EventClassCard({ event, joined = false, manage = false }: {
  event: PassFlowEvent; joined?: boolean; manage?: boolean;
}) {
  const href = manage ? `/admin/events/${event.id}` : joined ? `/e/${event.slug}/claim` : `/e/${event.slug}`;
  return <Link href={href} className="class-event-card" style={{ "--card-brand": event.theme.primary, "--card-brand-ink": eventInk(event.theme.primary), "--card-secondary": event.theme.secondary } as CSSProperties}>
    <div className="class-event-cover">
      {event.heroImageUrl || event.posterUrl ? <Image src={(event.heroImageUrl || event.posterUrl)!} fill unoptimized sizes="(max-width: 680px) 90vw, (max-width: 1100px) 45vw, 360px" alt="" className="class-event-image"/> : <div className="class-event-ticket" aria-hidden="true"><span className="hero-fan-meta"><b>PassFlow</b>{event.dateLabel}</span><strong>{event.name}</strong><span className="hero-fan-barcode"/></div>}
      <span className="class-event-badge" data-state={manage ? event.status : joined ? "joined" : "open"}><i/>{manage ? event.status === "published" ? "Published" : "Draft" : joined ? "Registered" : "Open event"}</span>
    </div>
    <div className="class-event-body">
      <h3>{event.name}</h3>
      <p><CalendarDays size={15}/>{event.dateLabel}</p>
      <p><MapPin size={15}/>{event.venue || "Venue to be announced"}</p>
    </div>
    {manage && <div className="flow-event-progress"><span><b>{event.checkedInCount.toLocaleString("en-US")}</b> / {event.attendeeCount.toLocaleString("en-US")}</span><progress value={event.checkedInCount} max={Math.max(event.attendeeCount, event.checkedInCount, 1)} aria-label={`${event.name}: ${event.checkedInCount} of ${event.attendeeCount} attendees checked in`}/><small>checked in</small></div>}
    <div className="class-event-footer">
      <span>{manage ? "Manage event" : joined ? "Open digital pass" : "View details"}</span>
      <span className="class-event-footer-right">
        {event.attendeeCount > 0 && (
          <AvatarCircles
            className="event-card-avatar-circles"
            people={event.participantPreview ?? []}
            extra={Math.max(0, event.attendeeCount - (event.participantPreview?.length ?? 0))}
          />
        )}
        <ArrowUpRight size={19}/>
      </span>
    </div>
  </Link>;
}
