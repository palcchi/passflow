import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getManagedEvent } from "@/lib/events";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { AnimatedList } from "@/components/magicui/animated-list";
import { requireOrganizerMembership } from "@/lib/auth/session";

type Props = { params: Promise<{ eventId: string }> };

export default async function EventOverviewPage({ params }: Props) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase } = await requireOrganizerMembership(
    `/admin/events/${eventId}`,
  );

  const [
    credentialsResult,
    stationsResult,
    scansResult,
    activityCountResult,
    benefitCountResult,
    ticketCountResult,
  ] = await Promise.all([
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
    supabase
      .from("ticket_types")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
  ]);

  const credentials = credentialsResult.data ?? [];
  const stations = stationsResult.data ?? [];
  const scans = scansResult.data ?? [];
  const activeQr = credentials.filter((item) => item.status === "active").length;
  const unclaimedQr = credentials.filter(
    (item) => item.status === "unclaimed",
  ).length;
  const denied = scans.filter(
    (item) => item.decision === "denied" || item.decision === "invalid",
  ).length;
  const activeStations = stations.filter((item) => item.is_active).length;

  const attendeeIds = [
    ...new Set(scans.map((scan) => scan.attendee_id).filter(Boolean)),
  ] as string[];
  const attendeeResult = attendeeIds.length
    ? await supabase.from("attendees").select("id,name").eq("event_id", eventId).in("id", attendeeIds)
    : { data: [] };
  const attendeeName = new Map(
    (attendeeResult.data ?? []).map((item) => [item.id, item.name]),
  );
  const stationName = new Map(
    stations.map((item) => [item.id, item.name]),
  );

  const metrics = [
    { label: "Registered", value: event.attendeeCount, note: "attendee" },
    { label: "Checked in", value: event.checkedInCount, note: "checked in" },
    {
      label: "QR active",
      value: activeQr,
      note: `${unclaimedQr} unlinked`,
    },
    { label: "Denied", value: denied, note: "recent scans" },
  ];

  // Mirrors transition_event's publish checks (basics + a ticket type), plus two recommended steps.
  const base = `/admin/events/${eventId}`;
  const checklist = [
    { done: !!(event.venue && event.startsAt && event.endsAt), title: "Add venue and dates", href: `${base}/settings`, required: true },
    { done: (ticketCountResult.count ?? 0) > 0, title: "Create a ticket type", href: `${base}/people`, required: true },
    { done: !!(event.heroImageUrl || event.posterUrl || event.theme.tagline), title: "Set the look in Design", href: `${base}/design`, required: false },
    { done: activeStations > 0, title: "Set up a scanner station", href: `${base}/access`, required: false },
    { done: event.status === "published", title: "Publish the event", href: `${base}/settings`, required: true },
  ];
  const remaining = checklist.filter((item) => !item.done).length;

  return (
    <>
      <section className="event-admin-metrics" aria-label="Event overview">
        {metrics.map(({ label, value, note }) => (
          <div className="event-admin-metric" key={label}>
            <span>{label}</span>
            <strong><NumberTicker value={Number(value)} /></strong>
            <small>{note}</small>
          </div>
        ))}
      </section>

      <div className="event-overview-grid">
        <section className="event-admin-section">
          <div className="event-admin-section-head">
            <div>
              <span className="section-kicker">Launch checklist</span>
              <h2>{remaining ? `${remaining} step${remaining > 1 ? "s" : ""} to go` : "Ready for the day"}</h2>
              <p>Required steps unlock publishing; recommended ones make check-in smooth.</p>
            </div>
          </div>
          <ol className="launch-checklist">
            {checklist.map(({ done, title, href, required }) => (
              <li key={title} data-done={done || undefined}>
                <Link href={href}>
                  <span className="launch-check" aria-hidden="true">{done ? "✓" : ""}</span>
                  <strong>{title}</strong>
                  <small>{done ? "Done" : required ? "Required" : "Recommended"}</small>
                  <ArrowUpRight size={14} />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="event-admin-section">
          <div className="event-admin-section-head">
            <div>
              <span className="section-kicker">Scanner network</span>
              <h2>{activeStations} active</h2>
              <p>{stations.length} stations connected to this event.</p>
            </div>
          </div>
          <div className="event-admin-stack">
            {stations.slice(0, 5).map((station) => (
              <Link
                href={`/scan/${station.id}`}
                className="event-admin-row-card event-overview-station"
                key={station.id}
              >
                <span
                  className={`organizer-station-dot ${station.is_active ? "is-active" : ""}`}
                />
                <strong>{station.name}</strong>
                <small>{station.is_active ? "Active" : "Standby"}</small>
              </Link>
            ))}
            {!stations.length && (
              <div className="event-admin-table-empty">
                No scanner stations have been configured yet.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="event-admin-section">
        <div className="event-admin-section-head">
          <div>
            <span className="section-kicker">Recent activity</span>
            <h2>Latest scans</h2>
            <p>
              {activityCountResult.count ?? 0} activity logs ·{" "}
              {benefitCountResult.count ?? 0} benefit claims
            </p>
          </div>
          <Link
            className="organizer-text-link"
            href={`/admin/events/${eventId}/access`}
          >
            Open access <ArrowUpRight size={14} />
          </Link>
        </div>

        <AnimatedList className="event-admin-scan-list">
          {scans.map((scan) => (
            <div className="event-admin-scan-row" key={scan.id}>
              <span>
                {scan.attendee_id
                  ? attendeeName.get(scan.attendee_id) ?? "Attendee"
                  : "Unknown pass"}
              </span>
              <span>
                {scan.scanner_station_id
                  ? stationName.get(scan.scanner_station_id) ?? "Station"
                  : "Station"}
              </span>
              <strong
                className={`event-admin-scan-decision is-${scan.decision}`}
              >
                {scan.decision}
              </strong>
            </div>
          ))}
          {!scans.length && (
            <div className="event-admin-table-empty">No scan activity has been recorded yet.</div>
          )}
        </AnimatedList>
      </section>
    </>
  );
}
