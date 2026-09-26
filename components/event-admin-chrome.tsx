import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Palette, Sparkles } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";
import { UserNavbar } from "@/components/user-navbar";
import { EventAdminNav } from "@/components/event-admin-nav";
import { BlurFade } from "@/components/magicui/blur-fade";
import { ShineBorder } from "@/components/magicui/shine-border";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { ShimmerButton } from "@/components/magicui/shimmer-button";

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
  return (
    <div className="app-surface min-h-screen text-neutral-950">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />
      <div className="ambient-orb ambient-orb-three" />

      <UserNavbar
        name={profile.name}
        email={profile.email}
        avatarUrl={profile.avatarUrl}
        organizer
      />

      <main className="event-admin-shell relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        <BlurFade>
          <header className="event-admin-hero liquid-panel">
            <ShineBorder duration={20} borderWidth={1} />
            <div className="event-admin-hero-main">
              <Link href="/admin" className="event-admin-back">
                <ArrowLeft size={15} /> Organizer
              </Link>

              <AnimatedShinyText className="event-admin-kicker">
                <Sparkles size={13} />
                {event.status} event
              </AnimatedShinyText>

              <div className="event-admin-title-row">
                <div>
                  <h1>{event.name}</h1>
                  <p>{event.dateLabel} · {event.venue || "Venue belum ditentukan"}</p>
                </div>
                <span className="event-admin-slug">{event.slug}</span>
              </div>
            </div>

            <div className="event-admin-hero-actions">
              <Link className="button button-ghost" href={`/admin/events/${event.id}/appearance`}>
                <Palette size={16} /> Customize
              </Link>
              <Link className="button button-ghost" href={`/admin/events/${event.id}/design`}>
                <Sparkles size={16} /> PassFlow Design
              </Link>
              <ShimmerButton asChild className="event-admin-public-cta">
                <Link href={`/e/${event.slug}`}>
                  <ExternalLink size={16} /> Public page
                </Link>
              </ShimmerButton>
            </div>
          </header>
        </BlurFade>

        <BlurFade delay={0.03}>
          <EventAdminNav eventId={event.id} />
        </BlurFade>

        {children}
      </main>
    </div>
  );
}

export function eventAdminProfile(user: {
  email?: string | null;
  user_metadata: Record<string, unknown>;
}) {
  const username =
    typeof user.user_metadata.username === "string" ? user.user_metadata.username.trim() : "";
  const fullName =
    typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata.picture === "string"
        ? user.user_metadata.picture
        : null;
  return {
    name: fullName || username || user.email?.split("@")[0] || "Organizer",
    email: user.email,
    avatarUrl,
  };
}
