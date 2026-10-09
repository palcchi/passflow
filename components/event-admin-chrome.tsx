import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, Lock } from "lucide-react";
import { eventInk } from "@/lib/event-colors";
import { EventArtwork } from "@/components/event-artwork";
import { accountProfile } from "@/lib/auth/session";
import type { PassFlowEvent } from "@/lib/events";
import { AppShell } from "@/components/app-shell";
import { EventAdminNav } from "@/components/event-admin-nav";
import { badgeClass, eventStage } from "@/lib/event-stage";

type Profile = { name: string; email?: string | null; avatarUrl?: string | null };

export function EventAdminChrome({ event, profile, children }: { event: PassFlowEvent; profile: Profile; children: ReactNode }) {
  const eventStyle = {
    "--event-admin-accent": event.theme.primary,
    "--event-admin-secondary": event.theme.secondary,
    "--event-admin-accent-text": eventInk(event.theme.primary),
    "--page-accent": event.theme.primary,
  } as CSSProperties;
  const stage = eventStage(event);
  const cover = event.heroImageUrl || event.posterUrl;

  return (
    <AppShell name={profile.name} email={profile.email} avatarUrl={profile.avatarUrl} organizer style={eventStyle}>
      <div className="event-admin-context">
        <Link href="/organizer/events" className="ui-back"><ArrowLeft size={14} />All events</Link>
        <header className="ui-eventhead">
          <span className="ui-eventhead-thumb" aria-hidden="true">{cover ? <Image src={cover} fill unoptimized sizes="72px" alt="" /> : <EventArtwork event={event} />}</span>
          <div className="ui-eventhead-main">
            <div className="ui-row">
              <span className={badgeClass(stage.tone)}>{stage.label}</span>
              {event.visibility === "private" && <span className="ui-badge"><Lock size={11} />Private</span>}
              {event.requiresApproval && <span className="ui-badge ui-badge-info">Approval on</span>}
              {event.hasDraftChanges && <span className="ui-badge ui-badge-warning">Unpublished changes</span>}
            </div>
            <h1>{event.name}</h1>
            <p>{event.dateLabel}{event.venue ? ` · ${event.venue}` : ""}</p>
          </div>
          <Link href={`/e/${event.liveSlug ?? event.slug}?view=details`} className="ui-btn ui-btn-secondary" target="_blank">Event page <ArrowUpRight size={15} /></Link>
        </header>
        <EventAdminNav eventId={event.id} />
        <div className="ui-workspace-body">{children}</div>
      </div>
    </AppShell>
  );
}

export function eventAdminProfile(user: Parameters<typeof accountProfile>[0]) {
  const { name, email, avatarUrl } = accountProfile(user);
  return { name: name || "Organizer", email, avatarUrl };
}
