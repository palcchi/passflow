import { requireOrganizer } from "@/lib/auth/session";
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
import { getManagedEvents } from "@/lib/events";


export default async function AdminDashboardPage() {
  const { supabase } = await requireOrganizer();
  const events = await getManagedEvents();
  const eventIds = events.map(event => event.id);
  const [qrResult, stationResult] = eventIds.length ? await Promise.all([
    supabase.from("qr_credentials").select("id", {count:"exact",head:true}).in("event_id",eventIds).eq("status","active"),
    supabase.from("scanner_stations").select("id,name,is_active").in("event_id",eventIds).order("name")
  ]) : [{count:0}, {data:[]}];
  const statCards = [
    {label:"Total events",value:events.length,icon:CalendarRange},
    {label:"Registered",value:events.reduce((n,e)=>n+e.attendeeCount,0),icon:UsersRound},
    {label:"Checked in",value:events.reduce((n,e)=>n+e.checkedInCount,0),icon:TicketCheck},
    {label:"QR active",value:qrResult.count ?? 0,icon:QrCode}
  ];
  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup sidebar-brand">
          <span className="brand-mark">P</span>
          <span>PassFlow</span>
        </Link>
        <div className="sidebar-section">
          <Link href="/account" className="sidebar-link">Akun saya</Link>
          <span className="sidebar-label">Workspace</span>
          <Link href="/admin" className="sidebar-link active">
            Overview
          </Link>
          <a className="sidebar-link" href="#events">
            Events
          </a>
          <Link href="#stations" className="sidebar-link">
            Scanner
          </Link>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">PF</span>
          <div>
            <strong>PassFlow workspace</strong>
            <small>Project workspace</small>
          </div>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="section-kicker">Workspace overview</span>
            <h1>Good afternoon, organizer.</h1>
            <p>Monitor semua event dari satu tempat. Data event dan check-in terbaru dari workspace.</p>
          </div>
          <Button asChild><Link href="/admin/events/new"><CirclePlus size={17} /> New event</Link></Button>
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
            <span className="soft-badge">{events.length} events</span>
          </div>

          <div className="event-list">
            {events.length === 0 && <p>Belum ada event. Pilih New event untuk mulai.</p>}
            {events.map((event) => {
              const percentage = Math.round(
                event.attendeeCount ? (event.checkedInCount / event.attendeeCount) * 100 : 0
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
                      href={`/admin/events/${event.id}`}
                      className="button button-small"
                    >
                      Manage
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dashboard-section compact-section" id="stations">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Scanner status</span>
              <h2>Access stations</h2>
            </div>
            <ScanLine size={20} />
          </div>
          <div className="station-grid">
            {(stationResult.data ?? []).map(({id, name, is_active}) => (
              <Link href={`/scan/${id}`} className="station-card" key={id}>
                <span className={`station-status ${is_active ? "online" : "standby"}`}>
                  {is_active ? "Active" : "Standby"}
                </span>
                <strong>{name}</strong>
                <small>Open scanner</small>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
