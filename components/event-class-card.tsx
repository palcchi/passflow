import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Lock } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";
import { EventArtwork } from "@/components/event-artwork";
import { AvatarCircles } from "@/components/magicui/avatar-circles";
import { badgeClass, eventStage } from "@/lib/event-stage";

export type Registration = "approved" | "pending" | "rejected";

function Cover({ event, sizes }: { event: PassFlowEvent; sizes: string }) {
  const src = event.heroImageUrl || event.posterUrl;
  return src ? <Image src={src} fill unoptimized sizes={sizes} alt="" /> : <EventArtwork event={event} />;
}

export function EventClassCard({ event, joined = false, registration, manage = false, featured = false }: {
  event: PassFlowEvent; joined?: boolean; registration?: Registration; manage?: boolean; featured?: boolean;
}) {
  const stage = eventStage(event);
  if (manage) {
    return <Link href={`/organizer/events/${event.id}`} className="ui-eventrow">
      <span className="ui-eventrow-thumb"><Cover event={event} sizes="64px" /></span>
      <span className="ui-eventrow-main">
        <strong>{event.name}</strong>
        <small>{event.dateLabel}{event.venue ? ` · ${event.venue}` : ""}</small>
      </span>
      <span className="ui-eventrow-meta">
        <span className={badgeClass(stage.tone)}>{stage.label}</span>
        {event.visibility === "private" && <span className="ui-badge"><Lock size={11} />Private</span>}
      </span>
      <span className="ui-eventrow-count ui-num"><span><b>{event.checkedInCount.toLocaleString("en-US")}</b> / {event.attendeeCount.toLocaleString("en-US")}</span><small>checked in</small></span>
      <ArrowUpRight size={18} className="ui-eventrow-arrow" />
    </Link>;
  }
  const state = registration ?? (joined ? "approved" : undefined);
  const href = state === "approved" || state === "pending" ? `/e/${event.slug}/claim` : `/e/${event.slug}`;
  const badge = state === "approved" ? { label: "Registered", tone: "success" as const }
    : state === "pending" ? { label: "Waiting for approval", tone: "warning" as const }
    : state === "rejected" ? { label: "Not approved", tone: "danger" as const }
    : stage.label === "Coming soon" ? stage : event.requiresApproval ? { label: "Approval required", tone: "info" as const } : null;
  return <Link href={href} className={featured ? "ui-eventcard ui-eventcard-featured" : "ui-eventcard"}>
    <span className="ui-eventcard-cover"><Cover event={event} sizes={featured ? "(max-width: 860px) 92vw, 620px" : "(max-width: 680px) 92vw, (max-width: 1100px) 46vw, 360px"} /></span>
    <span className="ui-eventcard-body">
      <span className="ui-eventcard-date">{event.dateLabel}</span>
      <strong>{event.name}</strong>
      <span className="ui-eventcard-venue">{event.venue || "Venue to be announced"}</span>
      <span className="ui-eventcard-foot">
        {badge ? <span className={badgeClass(badge.tone)}>{badge.label}</span> : <span className="ui-eventcard-cta">View event</span>}
        {event.attendeeCount > 0 && <AvatarCircles className="ui-eventcard-people" people={event.participantPreview ?? []} extra={Math.max(0, event.attendeeCount - (event.participantPreview?.length ?? 0))} />}
      </span>
    </span>
  </Link>;
}
