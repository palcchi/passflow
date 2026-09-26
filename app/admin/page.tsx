export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  CirclePlus,
  LayoutDashboard,
  QrCode,
  ScanLine,
  Sparkles,
  TicketCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { requireOrganizer } from "@/lib/auth/session";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { BlurFade } from "@/components/magicui/blur-fade";
import { Button } from "@/components/ui/button";
import { getManagedEvents } from "@/lib/events";

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
          .select("id,name,is_active")
          .in("event_id", eventIds)
          .order("name"),
      ])
    : [{ count: 0 }, { data: [] }];

  const fullName =
    typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : typeof user.user_metadata.username === "string" && user.user_metadata.username.trim()
        ? user.user_metadata.username.trim()
        : user.email?.split("@")[0] || "Organizer";
  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata.picture === "string"
        ? user.user_metadata.picture
        : null;
  const initial = fullName.charAt(0).toUpperCase() || "P";

  const statCards = [
    { label: "Total events", value: events.length, icon: CalendarRange },
    {
      label: "Registered",
      value: events.reduce((total, event) => total + event.attendeeCount, 0),
      icon: UsersRound,
    },
    {
      label: "Checked in",
      value: events.reduce((total, event) => total + event.checkedInCount, 0),
      icon: TicketCheck,
    },
    { label: "QR active", value: qrResult.count ?? 0, icon: QrCode },
  ];

  return (
    <main className="dashboard-shell admin-glass-shell">
      <aside className="sidebar admin-glass-sidebar">
        <Link href="/admin" className="brand-lockup sidebar-brand">
          <span className="brand-mark">P</span>
          <span>PassFlow</span>
        </Link>

        <div className="sidebar-section">
          <span className="sidebar-label">Workspace</span>
          <Link href="/admin" className="sidebar-link active">
            <LayoutDashboard size={15} /> Overview
          </Link>
          <a className="sidebar-link" href="#events">
            <CalendarRange size={15} /> Events
          </a>
          <a className="sidebar-link" href="#stations">
            <ScanLine size={15} /> Scanner
          </a>

          <span className="sidebar-label sidebar-label-spaced">Account</span>
          <Link href="/account" className="sidebar-link">
            <UserRound size={15} /> My dashboard
          </Link>
          <Link href="/profile" className="sidebar-link">
            <Sparkles size={15} /> Profile & integrations
          </Link>
        </div>

        <Link href="/profile" className="sidebar-footer admin-profile-card">
          <span
            className="avatar admin-sidebar-avatar"
            style={avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined}
          >
            {!avatarUrl && initial}
          </span>
          <div>
            <strong>{fullName}</strong>
            <small>{user.email}</small>
          </div>
        </Link>
      </aside>

      <section className="dashboard-content">
        <nav className="admin-mobile-nav liquid-nav">
          <Link href="/admin" className="user-nav-brand">
            <span className="brand-mark user-nav-brand-mark">P</span>
            <span>PassFlow</span>
          </Link>
          <div>
            <Link href="/profile" className="user-nav-icon-button" aria-label="Profile">
              <UserRound size={17} />
            </Link>
            <Link href="/admin/events/new" className="user-nav-icon-button" aria-label="New event">
              <CirclePlus size={17} />
            </Link>
          </div>
        </nav>

        <BlurFade>
          <header className="dashboard-header admin-dashboard-hero">
            <div>
              <span className="dashboard-welcome-kicker">
                <Sparkles size={13} /> Organizer workspace
              </span>
              <h1>Good evening, {fullName.split(" ")[0]}.</h1>
              <p>
                Monitor event, attendance, QR, dan scanner dari satu workspace yang akhirnya
                tidak terasa seperti panel admin tahun 2014.
              </p>
            </div>
            <Button asChild className="admin-new-event-button">
              <Link href="/admin/events/new">
                <CirclePlus size={17} /> New event
              </Link>
            </Button>
          </header>
        </BlurFade>

        <div className="stat-grid">
          {statCards.map(({ label, value, icon: Icon }, index) => (
            <BlurFade delay={0.04 + index * 0.035} key={label}>
              <article className="stat-card admin-stat-card liquid-panel">
                <div className="stat-icon">
                  <Icon size={19} />
                </div>
                <span>{label}</span>
                <strong>
                  <NumberTicker value={Number(value)} />
                </strong>
              </article>
            </BlurFade>
          ))}
        </div>

        <section className="dashboard-section" id="events">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Events</span>
              <h2>Active workspace</h2>
            </div>
            <span className="soft-badge">{events.length} events</span>
          </div>

          <div className="event-list admin-event-list liquid-panel">
            {events.length === 0 && (
              <div className="admin-empty-row">
                <strong>Belum ada event.</strong>
                <span>Buat event pertama untuk mulai mengelola akses dan peserta.</span>
                <Link href="/admin/events/new" className="button button-dark">
                  <CirclePlus size={15} /> New event
                </Link>
              </div>
            )}
            {events.map((event) => {
              const percentage = Math.round(
                event.attendeeCount ? (event.checkedInCount / event.attendeeCount) * 100 : 0,
              );

              return (
                <article className="event-row" key={event.id}>
                  <div className="event-color" style={{ background: event.theme.primary }} />
                  <div className="event-main">
                    <span>{event.eyebrow}</span>
                    <h3>{event.name}</h3>
                    <small>
                      {event.dateLabel} · {event.venue || "Venue belum ditentukan"}
                    </small>
                  </div>
                  <div className="event-progress-wrap">
                    <div className="event-progress-meta">
                      <span>Check-in</span>
                      <strong>{percentage}%</strong>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${percentage}%`,
                          background: event.theme.primary,
                        }}
                      />
                    </div>
                  </div>
                  <div className="event-count">
                    <strong>{event.checkedInCount}</strong>
                    <span>/ {event.attendeeCount}</span>
                  </div>
                  <div className="event-actions">
                    <Link
                      href={`/e/${event.slug}`}
                      className="icon-button"
                      aria-label="Open public event page"
                    >
                      <ArrowRight size={17} />
                    </Link>
                    <Link href={`/admin/events/${event.id}`} className="button button-small">
                      Manage
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dashboard-section compact-section admin-station-section" id="stations">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Scanner status</span>
              <h2>Access stations</h2>
            </div>
            <ScanLine size={20} />
          </div>
          <div className="station-grid">
            {(stationResult.data ?? []).map(({ id, name, is_active }) => (
              <Link href={`/scan/${id}`} className="station-card" key={id}>
                <span className={`station-status ${is_active ? "online" : "standby"}`}>
                  {is_active ? "Active" : "Standby"}
                </span>
                <strong>{name}</strong>
                <small>Open scanner</small>
              </Link>
            ))}
            {!(stationResult.data ?? []).length && (
              <div className="admin-empty-station">
                Belum ada scanner station pada event yang kamu kelola.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
