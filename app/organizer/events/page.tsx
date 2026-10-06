export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { ArrowUpRight, FolderOpen, Plus, Sparkles } from "lucide-react";
import { accountProfile, requireOrganizer } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/platform";
import { serviceClient } from "@/lib/supabase/service";
import { UserNavbar } from "@/components/user-navbar";
import { getManagedEvents } from "@/lib/events";
import { HeroCardFan } from "@/components/hero-card-fan";
import { KineticText } from "@/components/magicui/kinetic-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { AnimatedList } from "@/components/magicui/animated-list";
import { EventCollection } from "@/components/event-collection";

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

  const { name: accountName, avatarUrl } = accountProfile(user);
  const name = accountName || "Organizer";

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

  // PassFlow admins reach the organizer list from their own dashboard.
  const platformAdmin = isPlatformAdmin(user);
  let organizerCount = 0;
  if (platformAdmin) {
    try { organizerCount = (await serviceClient().from("organizer_applications").select("user_id", { count: "exact", head: true }).eq("status", "approved")).count ?? 0; } catch {}
  }

  const stats = [
    ["Events", events.length, "managed"],
    ["Registered", totalRegistered, "attendees"],
    ["Checked in", totalCheckedIn, "entries"],
    ["QR active", qrResult.count ?? 0, "credentials"],
  ] as const;

  return (
    <div className="app-surface flow-workspace studio-backdrop min-h-screen">
      <UserNavbar
        name={name}
        email={user.email}
        avatarUrl={avatarUrl}
        organizer
      />

      <main className="studio-page-shell">
        <header className="studio-page-hero workspace-welcome">
          <div className="workspace-welcome-copy">
            <span className="editorial-eyebrow"><span/> ORGANIZER WORKSPACE</span>
            <KineticText
              text={`Welcome, ${name}.`}
              className="studio-page-title"
            />
            <TextAnimate className="studio-page-subtitle" delay={0.05}>
              Everything happening across your events, in one workspace.
            </TextAnimate>
          <ShinyButton href="/organizer/events/new"><Plus size={15}/>Create event</ShinyButton>
          </div>
          <div className="workspace-fan"><HeroCardFan events={events} compact/></div>
        </header>

        {platformAdmin && <Link className="recent-project" href="/platform/organizers"><span className="recent-project-icon"><Sparkles size={21}/></span><span className="recent-project-copy"><span>PASSFLOW ADMIN</span><strong>Organizers · {organizerCount} active</strong></span><ArrowUpRight size={19}/></Link>}
        {events[0] && <Link className="recent-project" href={`/organizer/events/${events[0].id}`}><span className="recent-project-icon"><FolderOpen size={21}/></span><span className="recent-project-copy"><span>LATEST EVENT · CONTINUE MANAGING</span><strong>{events[0].name}</strong></span><ArrowUpRight size={19}/></Link>}

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
              <h2 id="managed-events">Your events</h2>
            </div>
          </div>

          <EventCollection events={events} manage/>
        </section>

        <section className="studio-section" aria-labelledby="scanner-stations">
          <div className="studio-section-heading">
            <div>
              <p className="section-kicker">Scanner network</p>
              <h2 id="scanner-stations">Event entry points.</h2>
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
            <div className="studio-empty-line">No scanner stations have been configured yet.</div>
          )}
        </section>
      </main>
    </div>
  );
}
