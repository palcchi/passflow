export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireOrganizer } from "@/lib/auth/session";
import { UserNavbar } from "@/components/user-navbar";
import { getManagedEvents } from "@/lib/events";
import { KineticText } from "@/components/magicui/kinetic-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { AnimatedList } from "@/components/magicui/animated-list";

export default async function AdminDashboardPage() {
  const { supabase, user } = await requireOrganizer();
  const events = await getManagedEvents();
  const eventIds = events.map((event) => event.id);

  const [qrResult, stationResult] = eventIds.length
    ? await Promise.all([
        supabase
          .from("qr_credentials")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIds)
          .eq("status", "active"),
        supabase
          .from("scanner_stations")
          .select("id,name,is_active,event_id")
          .in("event_id", eventIds)
          .order("name"),
      ])
    : [{ count: 0 }, { data: [] }];

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
  const name = fullName || username || user.email?.split("@")[0] || "Organizer";

  const totalRegistered = events.reduce(
    (total, event) => total + event.attendeeCount,
    0,
  );
  const totalCheckedIn = events.reduce(
    (total, event) => total + event.checkedInCount,
    0,
  );
  const activeStations = (stationResult.data ?? []).filter(
    (station) => station.is_active,
  ).length;

  const stats = [
    ["Events", events.length, "managed"],
    ["Registered", totalRegistered, "attendees"],
    ["Checked in", totalCheckedIn, "entries"],
    ["QR active", qrResult.count ?? 0, "credentials"],
  ] as const;

  return (
    <div className="app-surface studio-backdrop min-h-screen">
      <UserNavbar
        name={name}
        email={user.email}
        avatarUrl={avatarUrl}
        organizer
      />

      <main className="studio-page-shell">
        <header className="studio-page-hero organizer-studio-hero">
          <div>
            <span className="section-kicker">Organizer workspace</span>
            <KineticText
              text="Manage the flow, not the clutter."
              className="studio-page-title"
            />
            <TextAnimate className="studio-page-subtitle" delay={0.05}>
              Event, attendee, credential, scanner, dan design tersusun sebagai satu alur kerja.
            </TextAnimate>
          </div>

          <ShinyButton href="/admin/events/new">Buat event</ShinyButton>
        </header>

        <section className="studio-metric-strip" aria-label="Organizer metrics">
          {stats.map(([label, value, note]) => (
            <div className="studio-metric" key={label}>
              <span>{label}</span>
              <strong><NumberTicker value={Number(value)} /></strong>
              <small>{note}</small>
            </div>
          ))}
        </section>

        <section className="studio-section" aria-labelledby="managed-events">
          <div className="studio-section-heading">
            <div>
              <p className="section-kicker">Managed events</p>
              <h2 id="managed-events">Event kamu</h2>
            </div>
            <Link href="/admin/events/new" className="studio-text-link">
              Tambah <ArrowUpRight size={14} />
            </Link>
          </div>

          {events.length > 0 ? (
            <div className="studio-managed-list">
              {events.map((event) => {
                const percentage = Math.round(
                  event.attendeeCount
                    ? (event.checkedInCount / event.attendeeCount) * 100
                    : 0,
                );

                return (
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="studio-managed-row"
                    key={event.id}
                    style={{ "--row-accent": event.theme.primary } as React.CSSProperties}
                  >
                    <span
                      className="studio-managed-visual"
                      aria-hidden="true"
                      style={event.heroImageUrl ? { backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${event.theme.primary} 48%, transparent), rgba(20,20,18,.16)), url(\"${event.heroImageUrl}\")` } : { background: `linear-gradient(135deg, ${event.theme.primary}, color-mix(in srgb, ${event.theme.secondary} 62%, white))` }}
                    />
                    <span className="studio-event-accent" />
                    <div className="studio-managed-main">
                      <span>{event.status} · {event.dateLabel}</span>
                      <h3>{event.name}</h3>
                      <p>{event.venue || "Venue belum ditentukan"}</p>
                    </div>
                    <div className="studio-managed-progress">
                      <strong>{percentage}%</strong>
                      <span>{event.checkedInCount}/{event.attendeeCount} check-in</span>
                      <div><i style={{ width: `${percentage}%` }} /></div>
                    </div>
                    <ArrowUpRight size={15} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="studio-empty-state">
              <h3>Belum ada event.</h3>
              <p>Buat event pertama untuk memulai attendee dan access flow.</p>
              <ShinyButton href="/admin/events/new">Buat event pertama</ShinyButton>
            </div>
          )}
        </section>

        <section className="studio-section" aria-labelledby="scanner-stations">
          <div className="studio-section-heading">
            <div>
              <p className="section-kicker">Scanner network</p>
              <h2 id="scanner-stations">Access stations</h2>
            </div>
            <span className="studio-soft-label">{activeStations} active</span>
          </div>

          <AnimatedList className="studio-station-list">
            {(stationResult.data ?? []).map((station) => (
              <Link href={`/scan/${station.id}`} className="studio-station-row" key={station.id}>
                <span className={`studio-status-dot ${station.is_active ? "is-active" : ""}`} />
                <strong>{station.name}</strong>
                <small>{station.is_active ? "Active" : "Standby"}</small>
                <ArrowUpRight size={14} />
              </Link>
            ))}
          </AnimatedList>

          {!(stationResult.data ?? []).length && (
            <div className="studio-empty-line">Belum ada scanner station.</div>
          )}
        </section>
      </main>
    </div>
  );
}
