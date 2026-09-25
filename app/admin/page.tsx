import { NumberTicker } from "@/components/magicui/number-ticker";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  CirclePlus,
  QrCode,
  ScanLine,
  TicketCheck,
  UsersRound,
} from "lucide-react";
import { demoEvents } from "@/lib/events";

const statCards = [
  { label: "Total events", value: "2", icon: CalendarRange },
  { label: "Registered", value: "688", icon: UsersRound },
  { label: "Checked in", value: "398", icon: TicketCheck },
  { label: "QR active", value: "371", icon: QrCode },
];

export default function AdminDashboardPage() {
  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup sidebar-brand">
          <span className="brand-mark">P</span>
          <span>PassFlow</span>
        </Link>
        <div className="sidebar-section">
          <span className="sidebar-label">Workspace</span>
          <Link href="/admin" className="sidebar-link active">
            Overview
          </Link>
          <a className="sidebar-link" href="#events">
            Events
          </a>
          <Link href="/scan/main-entrance" className="sidebar-link">
            Scanner
          </Link>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">K7</span>
          <div>
            <strong>Kelompok 7</strong>
            <small>Project workspace</small>
          </div>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="section-kicker">Workspace overview</span>
            <h1>Good afternoon, team.</h1>
            <p>Monitor semua event dari satu tempat. Data di bawah adalah data demo.</p>
          </div>
          <Button variant="secondary" type="button" disabled title="Event management tersedia pada Phase 3">
            <CirclePlus size={17} />
            New event
          </Button>
        </header>

        <div className="stat-grid">
          {statCards.map(({ label, value, icon: Icon }) => (
            <article className="stat-card" key={label}>
              <div className="stat-icon">
                <Icon size={19} />
              </div>
              <span>{label}</span>
              <strong><NumberTicker value={Number(value)} /></strong>
            </article>
          ))}
        </div>

        <section className="dashboard-section" id="events">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Events</span>
              <h2>Active workspace</h2>
            </div>
            <span className="soft-badge">{demoEvents.length} events</span>
          </div>

          <div className="event-list">
            {demoEvents.map((event) => {
              const percentage = Math.round(
                (event.checkedInCount / event.attendeeCount) * 100
              );

              return (
                <article className="event-row" key={event.id}>
                  <div
                    className="event-color"
                    style={{ background: event.theme.primary }}
                  />
                  <div className="event-main">
                    <span>{event.eyebrow}</span>
                    <h3>{event.name}</h3>
                    <small>
                      {event.dateLabel} · {event.venue}
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
                    <Link
                      href={`/admin/events/${event.id}/appearance`}
                      className="button button-small"
                    >
                      Customize
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dashboard-section compact-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Scanner status</span>
              <h2>Access stations</h2>
            </div>
            <ScanLine size={20} />
          </div>
          <div className="station-grid">
            {[
              ["Main Entrance", "Online", "312 scans"],
              ["VIP Lounge", "Online", "74 scans"],
              ["Workshop A", "Standby", "38 scans"],
            ].map(([name, status, scans]) => (
              <div className="station-card" key={name}>
                <span className={`station-status ${status.toLowerCase()}`}>
                  {status}
                </span>
                <strong>{name}</strong>
                <small>{scans}</small>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

