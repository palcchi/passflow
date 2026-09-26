import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PassFlowEvent } from "@/lib/events";
import { UserNavbar } from "@/components/user-navbar";
import { EventAdminNav } from "@/components/event-admin-nav";

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
  } as CSSProperties;

  return (
    <div
      className="app-surface event-admin-context min-h-screen"
      style={eventStyle}
    >
      <UserNavbar
        name={profile.name}
        email={profile.email}
        avatarUrl={profile.avatarUrl}
        organizer
      />

      <main className="event-admin-shell mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8 sm:pt-10">
        <header className="event-admin-hero">
          <div className="event-admin-hero-main">
            <Link href="/admin" className="event-admin-back">
              <ArrowLeft size={14} /> Organizer
            </Link>

            <span className="event-admin-kicker">{event.status} event</span>

            <div className="event-admin-title-row">
              <div>
                <h1>{event.name}</h1>
                <p>
                  {event.dateLabel} · {event.venue || "Venue belum ditentukan"}
                </p>
              </div>
              <span className="event-admin-slug">{event.slug}</span>
            </div>
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
              PassFlow Design
            </Link>
            <Link
              className="button event-admin-public-cta"
              href={`/e/${event.slug}`}
            >
              Public page
            </Link>
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
