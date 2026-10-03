import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { eventInk } from "@/lib/event-colors";
import { EventArtwork } from "@/components/event-artwork";
import { accountProfile } from "@/lib/auth/session";
import { ArrowLeft } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";
import { UserNavbar } from "@/components/user-navbar";
import { EventAdminNav } from "@/components/event-admin-nav";
import { KineticText } from "@/components/magicui/kinetic-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { ShinyButton } from "@/components/magicui/shiny-button";

type Profile = {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export function EventAdminChrome({
  event,
  profile,
  children,
}: {
  event: PassFlowEvent;
  profile: Profile;
  children: ReactNode;
}) {
  const eventStyle = {
    "--event-admin-accent": event.theme.primary,
    "--event-admin-secondary": event.theme.secondary,
    "--event-admin-accent-text": eventInk(event.theme.primary),
    "--page-accent": event.theme.primary,
  } as CSSProperties;

  return (
    <div
      className="app-surface flow-workspace studio-backdrop event-admin-context min-h-screen"
      style={eventStyle}
    >
      <UserNavbar
        name={profile.name}
        email={profile.email}
        avatarUrl={profile.avatarUrl}
        organizer
      />

      <main className="event-admin-shell mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8 sm:pt-10">
        <header className="event-admin-hero studio-event-hero">
          <div className="event-admin-hero-main">
            <Link href="/admin" className="event-admin-back">
              <ArrowLeft size={14} /> Organizer
            </Link>

            <span className="event-admin-kicker">{event.status} event</span>

            <KineticText
              text={event.name}
              className="event-admin-kinetic-title"
            />
            <TextAnimate className="event-admin-meta-line" delay={0.03}>
              {`${event.dateLabel} · ${event.venue || "Venue not specified"}`}
            </TextAnimate>
          </div>

          <div className="event-admin-cover" aria-hidden="true">{event.heroImageUrl || event.posterUrl ? <Image src={(event.heroImageUrl || event.posterUrl)!} fill unoptimized sizes="210px" alt=""/> : <EventArtwork event={event}/>}</div>

          <div className="event-admin-hero-actions">
            <ShinyButton
              href={`/e/${event.liveSlug ?? event.slug}?view=details`}
              className="event-admin-public-cta"
            >
              Public page
            </ShinyButton>
          </div>
        </header>

        <EventAdminNav eventId={event.id} />
        <div className="event-admin-page-content">{children}</div>
      </main>
    </div>
  );
}

export function eventAdminProfile(user: Parameters<typeof accountProfile>[0]) {
  const { name, email, avatarUrl } = accountProfile(user);
  return { name: name || "Organizer", email, avatarUrl };
}
