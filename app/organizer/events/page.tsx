export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { accountProfile, requireOrganizer } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/platform";
import { serviceClient } from "@/lib/supabase/service";
import { getManagedEvents } from "@/lib/events";
import { AppShell } from "@/components/app-shell";
import { EventCollection } from "@/components/event-collection";

export const metadata = { title: "Organizer" };

export default async function AdminDashboardPage() {
  const { supabase, user } = await requireOrganizer();
  const events = await getManagedEvents();
  const eventIds = events.map((event) => event.id);

  const [qrResult, stationResult, pendingResult] = eventIds.length
    ? await Promise.all([
        supabase.from("qr_credentials").select("id", { count: "exact", head: true }).in("event_id", eventIds).eq("status", "active"),
        supabase.from("scanner_stations").select("id,name,is_active,event_id").in("event_id", eventIds).order("name"),
        supabase.from("attendees").select("event_id").in("event_id", eventIds).eq("approval_status", "pending"),
      ])
    : [{ count: 0 }, { data: [] }, { data: [] }];

  const { name: accountName, avatarUrl } = accountProfile(user);
  const name = accountName || "Organizer";
  const totalRegistered = events.reduce((total, event) => total + event.attendeeCount, 0);
  const totalCheckedIn = events.reduce((total, event) => total + event.checkedInCount, 0);
  const stations = stationResult.data ?? [];
  const pending = pendingResult.data ?? [];
  const pendingEvent = pending[0] ? events.find((event) => event.id === pending[0].event_id) : undefined;

  const platformAdmin = isPlatformAdmin(user);
  let organizerCount = 0;
  if (platformAdmin) {
    try { organizerCount = (await serviceClient().from("organizer_applications").select("user_id", { count: "exact", head: true }).eq("status", "approved")).count ?? 0; } catch {}
  }

  const stats = [
    ["Registered", totalRegistered, `across ${events.length} ${events.length === 1 ? "event" : "events"}`],
    ["Checked in", totalCheckedIn, totalRegistered ? `${Math.round((totalCheckedIn / totalRegistered) * 100)}% of registered` : "no check-ins yet"],
    ["Active passes", qrResult.count ?? 0, "QR credentials in use"],
    ["Scanners", stations.filter((station) => station.is_active).length, `${stations.length} configured`],
  ] as const;

  return (
    <AppShell name={name} email={user.email} avatarUrl={avatarUrl} organizer>
      <header className="ui-pagehead ui-rise">
        <div>
          <h1 className="ui-h1">Organizer</h1>
          <p className="ui-lead">Registrations, passes and check-in for every event you run.</p>
        </div>
        <div className="ui-row">
          {platformAdmin && <Link href="/platform/organizers" className="ui-btn ui-btn-secondary">Organizers <span className="ui-badge">{organizerCount}</span></Link>}
          <Link href="/organizer/events/new" className="ui-btn ui-btn-primary"><Plus size={16} />New event</Link>
        </div>
      </header>

      {pending.length > 0 && pendingEvent && (
        <Link href={`/organizer/events/${pendingEvent.id}/people`} className="ui-callout ui-rise">
          <span className="ui-badge ui-badge-warning">{pending.length}</span>
          <span><strong>{pending.length === 1 ? "1 registration is" : `${pending.length} registrations are`} waiting for your approval</strong><small>{pendingEvent.name}</small></span>
          <ArrowUpRight size={18} />
        </Link>
      )}

      <section className="ui-grid ui-grid-4 ui-rise ui-rise-2" aria-label="Totals">
        {stats.map(([label, value, note]) => (
          <div className="ui-stat" key={label}><span>{label}</span><strong>{Number(value).toLocaleString("en-US")}</strong><small>{note}</small></div>
        ))}
      </section>

      <section className="ui-section ui-rise ui-rise-3" aria-labelledby="managed-events">
        <div className="ui-sectionhead"><h2 id="managed-events" className="ui-h2">Events</h2></div>
        <EventCollection events={events} manage />
      </section>

      {stations.length > 0 && (
        <section className="ui-section" aria-labelledby="scanner-stations">
          <div className="ui-sectionhead">
            <div><h2 id="scanner-stations" className="ui-h2">Scanner stations</h2><p>Open a station on a phone to scan passes at the door.</p></div>
          </div>
          <ul className="ui-list">
            {stations.map((station) => (
              <li key={station.id}>
                <Link href={`/scan/${station.id}`} className="ui-listrow">
                  <span className="ui-listrow-main"><strong>{station.name}</strong><small>{events.find((event) => event.id === station.event_id)?.name}</small></span>
                  <span className="ui-listrow-end"><span className={station.is_active ? "ui-badge ui-badge-success" : "ui-badge"}>{station.is_active ? "Active" : "Paused"}</span><ArrowUpRight size={16} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
