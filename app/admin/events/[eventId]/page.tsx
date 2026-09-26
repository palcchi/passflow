import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  QrCode,
  ScanLine,
  Ticket,
  Users,
  Workflow,
} from "lucide-react";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { EventAdminChrome, eventAdminProfile } from "@/components/event-admin-chrome";
import { BlurFade } from "@/components/magicui/blur-fade";
import { MagicCard } from "@/components/magicui/magic-card";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { BorderBeam } from "@/components/magicui/border-beam";

type Props = { params: Promise<{ eventId: string }> };

export default async function EventOverviewPage({ params }: Props) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase, user } = await requireOrganizerMembership(`/admin/events/${eventId}`);
  const [credentialsResult, stationsResult, scansResult, activityCountResult, benefitCountResult] =
    await Promise.all([
      supabase
        .from("qr_credentials")
        .select("id,status", { count: "exact" })
        .eq("event_id", eventId),
      supabase
        .from("scanner_stations")
        .select("id,name,is_active")
        .eq("event_id", eventId)
        .order("name"),
      supabase
        .from("scan_logs")
        .select("id,decision,scanned_at,attendee_id,scanner_station_id")
        .eq("event_id", eventId)
        .order("scanned_at", { ascending: false })
        .limit(8),
      supabase
        .from("activity_logs")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId),
      supabase
        .from("benefit_claims")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId),
    ]);

  const credentials = credentialsResult.data ?? [];
  const stations = stationsResult.data ?? [];
  const scans = scansResult.data ?? [];
  const activeQr = credentials.filter((item) => item.status === "active").length;
  const unclaimedQr = credentials.filter((item) => item.status === "unclaimed").length;
  const denied = scans.filter((item) => item.decision === "denied" || item.decision === "invalid").length;
  const activeStations = stations.filter((item) => item.is_active).length;

  const attendeeIds = [...new Set(scans.map((scan) => scan.attendee_id).filter(Boolean))] as string[];
  const attendeeResult = attendeeIds.length
    ? await supabase.from("attendees").select("id,name").in("id", attendeeIds)
    : { data: [] };
  const attendeeName = new Map((attendeeResult.data ?? []).map((item) => [item.id, item.name]));
  const stationName = new Map(stations.map((item) => [item.id, item.name]));

  const metrics = [
    { label: "Registered", value: event.attendeeCount, icon: Users, note: "attendee" },
    { label: "Checked in", value: event.checkedInCount, icon: Ticket, note: "sudah masuk" },
    { label: "QR active", value: activeQr, icon: QrCode, note: `${unclaimedQr} unclaimed` },
    { label: "Denied", value: denied, icon: BarChart3, note: "recent scans" },
  ];

  const quickLinks = [
    {
      href: `/admin/events/${eventId}/people`,
      title: "People",
      copy: "Tickets, attendee, dan crew.",
      icon: Users,
    },
    {
      href: `/admin/events/${eventId}/access`,
      title: "Access",
      copy: "QR, zones, rules, dan scanner.",
      icon: Workflow,
    },
    {
      href: `/admin/events/${eventId}/experience`,
      title: "Experience",
      copy: "Activities dan benefit claims.",
      icon: QrCode,
    },
  ];

  return (
    <EventAdminChrome event={event} profile={eventAdminProfile(user)}>
      <section className="event-admin-metrics" aria-label="Event overview">
        {metrics.map(({ label, value, icon: Icon, note }, index) => (
          <BlurFade delay={0.05 + index * 0.03} key={label}>
            <MagicCard className="event-admin-metric liquid-panel">
              {index === 0 && <BorderBeam duration={8} size={72} />}
              <span className="event-admin-metric-icon"><Icon size={17} /></span>
              <div>
                <span>{label}</span>
                <strong><NumberTicker value={Number(value)} /></strong>
                <small>{note}</small>
              </div>
            </MagicCard>
          </BlurFade>
        ))}
      </section>

      <div className="event-overview-grid">
        <BlurFade delay={0.09}>
          <section className="event-admin-section liquid-panel">
            <div className="event-admin-section-head">
              <div>
                <span className="section-kicker">Quick access</span>
                <h2>Manage the event</h2>
                <p>Masuk ke area yang kamu butuhkan tanpa menggulir satu halaman sepanjang hidup.</p>
              </div>
            </div>
            <div className="event-overview-actions">
              {quickLinks.map(({ href, title, copy, icon: Icon }) => (
                <Link href={href} className="event-overview-action" key={href}>
                  <span className="event-admin-list-icon"><Icon size={16} /></span>
                  <div>
                    <strong>{title}</strong>
                    <small>{copy}</small>
                  </div>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          </section>
        </BlurFade>

        <BlurFade delay={0.11}>
          <section className="event-admin-section liquid-panel">
            <div className="event-admin-section-head">
              <div>
                <span className="section-kicker">Scanner network</span>
                <h2>{activeStations} active</h2>
                <p>{stations.length} station terhubung ke event ini.</p>
              </div>
              <span className="event-admin-section-icon"><ScanLine size={18} /></span>
            </div>
            <div className="event-admin-stack">
              {stations.slice(0, 5).map((station) => (
                <Link href={`/scan/${station.id}`} className="event-admin-row-card event-overview-station" key={station.id}>
                  <span className={`organizer-station-dot ${station.is_active ? "is-active" : ""}`} />
                  <strong>{station.name}</strong>
                  <small>{station.is_active ? "Active" : "Standby"}</small>
                </Link>
              ))}
              {!stations.length && <div className="event-admin-table-empty">Belum ada scanner station.</div>}
            </div>
          </section>
        </BlurFade>
      </div>

      <BlurFade delay={0.13}>
        <section className="event-admin-section liquid-panel">
          <div className="event-admin-section-head">
            <div>
              <span className="section-kicker">Recent activity</span>
              <h2>Latest scans</h2>
              <p>
                {activityCountResult.count ?? 0} activity logs · {benefitCountResult.count ?? 0} benefit claims
              </p>
            </div>
            <Link className="organizer-text-link" href={`/admin/events/${eventId}/access`}>
              Open access <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="event-admin-scan-list">
            {scans.map((scan) => (
              <div className="event-admin-scan-row" key={scan.id}>
                <span>{scan.attendee_id ? attendeeName.get(scan.attendee_id) ?? "Attendee" : "Unknown pass"}</span>
                <span>{scan.scanner_station_id ? stationName.get(scan.scanner_station_id) ?? "Station" : "Station"}</span>
                <strong className={`event-admin-scan-decision is-${scan.decision}`}>{scan.decision}</strong>
              </div>
            ))}
            {!scans.length && <div className="event-admin-table-empty">Belum ada scan log.</div>}
          </div>
        </section>
      </BlurFade>
    </EventAdminChrome>
  );
}
