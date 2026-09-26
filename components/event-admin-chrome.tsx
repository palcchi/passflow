import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
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

function eventAccentText(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((index) =>
    Number.parseInt(value.slice(index, index + 2), 16),
  );
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? "#171717" : "#ffffff";
}

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
    "--event-admin-accent-text": eventAccentText(event.theme.primary),
    "--page-accent": event.theme.primary,
  } as CSSProperties;

  return (
    <div
      className="app-surface studio-backdrop event-admin-context min-h-screen"
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
          <div
            className="event-admin-hero-art"
            aria-hidden="true"
            style={event.heroImageUrl ? { backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${event.theme.background} 84%, transparent), color-mix(in srgb, ${event.theme.background} 32%, transparent)), url(\"${event.heroImageUrl}\")` } : { background: `radial-gradient(circle at 82% 24%, color-mix(in srgb, ${event.theme.secondary} 76%, transparent), transparent 52%), linear-gradient(120deg, color-mix(in srgb, ${event.theme.primary} 14%, transparent), transparent 68%)` }}
          />
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
              {`${event.dateLabel} · ${event.venue || "Venue belum ditentukan"}`}
            </TextAnimate>
          </div>

          <div className="event-admin-hero-actions">
            <Link
              className="button button-ghost"
              href={`/admin/events/${event.id}/appearance`}
            >
              Customize
            </Link>
            <Link
              className="button button-ghost"
              href={`/admin/events/${event.id}/design`}
            >
              Design
            </Link>
            <ShinyButton
              href={`/e/${event.slug}`}
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

export function eventAdminProfile(user: {
  email?: string | null;
  user_metadata: Record<string, unknown>;
}) {
  const username =
    typeof user.user_metadata.username === "string"
      ? user.user_metadata.username.trim()
      : "";
  const fullName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
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
