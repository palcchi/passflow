import { requireOrganizerMembership } from "@/lib/auth/session";
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
import { listWorkspaceEvents } from "@/lib/events";

export default async function AdminDashboardPage() {
  const { supabase } = await requireOrganizerMembership();
  const events = await listWorkspaceEvents();
  const eventIds = events.map((event) => event.id);

  let registered = 0;
  let checkedIn = 0;
  let qrActive = 0;
  let stations: Array<{ id: string; name: string; slug: string; is_active: boolean; event_id: string }> = [];

  if (eventIds.length) {
    const [registeredResult, checkedResult, qrResult, stationResult] = await Promise.all([
      supabase.from("attendees").select("id", { count: "exact", head: true }).in("event_id", eventIds),
      supabase.from("attendees").select("id", { count: "exact", head: true }).in("event_id", eventIds).not("checked_in_at", "is", null),
      supabase.from("qr_credentials").select("id", { count: "exact", head: true }).in("event_id", eventIds).eq("status", "active"),
      supabase.from("scanner_stations").select("id, name, slug, is_active, event_id").in("event_id", eventIds).order("created_at", { ascending: true }).limit(8),
    ]);
    registered = registeredResult.count ?? 0;
    checkedIn = checkedResult.count ?? 0;
    qrActive = qrResult.count ?? 0;
    stations = stationResult.data ?? [];
  }

  const statCards = [
    { label: "Total events", value: events.length, icon: CalendarRange },
    { label: "Registered", value: registered, icon: UsersRound },
    { label: "Checked in", value: checkedIn, icon: TicketCheck },
    { label: "QR active", value: qrActive, icon: QrCode },
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
          <Link href="/admin" className="sidebar-link active">Overview</Link>
          <a className="sidebar-link" href="#events">Events</a>
          {stations[0] && <Link href={`/scan/${stations[0].id}`} className="sidebar-link">Scanner</Link>}
        </div>
        <div className="sidebar-footer">
          <span className="avatar">K7</span>
          <div><strong>Kelompok 7</strong><small>Project workspace</small></div>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="section-kicker">Workspace overview</span>
            <h1>Event operations, live.</h1>
            <p>Data dashboard dibaca langsung dari Supabase, bukan mock frontend.</p>
          </div>
          <Button asChild>
            <Link href="/admin/events/new"><CirclePlus size={17} /> New event</Link>
          </Button>
        </header>

        <div className="stat-grid">
          {statCards.map(({ label, value, icon: Icon }) => (
            <article className="stat-card" key={label}>
              <div className="stat-icon"><Icon size={19} /></div>
              <span>{label}</span>
              <strong><NumberTicker value={value} /></strong>
            </article>
          ))}
        </div>

        <section className="dashboard-section" id="events">
          <div className="section-heading">
            <div><span className="section-kicker">Events</span><h2>Workspace events</h2></div>
            <span className="soft-badge">{events.length} events</span>
          </div>

          <div className="event-list">
            {events.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                Belum ada event. Buat event pertama dari tombol New event.
              </div>
            )}
            {events.map((event) => {
              const percentage = event.attendeeCount
                ? Math.round((event.checkedInCount / event.attendeeCount) * 100)
                : 0;

              return (
                <article className="event-row" key={event.id}>
                  <div className="event-color" style={{ background: event.theme.primary }} />
                  <div className="event-main">
                    <span>{event.status.toUpperCase()}</span>
                    <h3>{event.name}</h3>
                    <small>{event.dateLabel} · {event.venue}</small>
                  </div>
                  <div className="event-progress-wrap">
                    <div className="event-progress-meta"><span>Check-in</span><strong>{percentage}%</strong></div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${percentage}%`, background: event.theme.primary }} />
                    </div>
                  </div>
                  <div className="event-count">
                    <strong>{event.checkedInCount}</strong>
                    <span>/ {event.attendeeCount}</span>
                  </div>
                  <div className="event-actions">
                    <Link href={`/e/${event.slug}`} className="icon-button" aria-label="Open public event page"><ArrowRight size={17} /></Link>
                    <Link href={`/admin/events/${event.id}`} className="button button-small">Manage</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dashboard-section compact-section">
          <div className="section-heading">
            <div><span className="section-kicker">Scanner status</span><h2>Access stations</h2></div>
            <ScanLine size={20} />
          </div>
          <div className="station-grid">
            {stations.length === 0 && <p className="text-sm text-muted-foreground">Belum ada scanner station.</p>}
            {stations.map((station) => (
              <Link className="station-card" key={station.id} href={`/scan/${station.id}`}>
                <span className={`station-status ${station.is_active ? "online" : "standby"}`}>
                  {station.is_active ? "Online" : "Standby"}
                </span>
                <strong>{station.name}</strong>
                <small>Open scanner</small>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
