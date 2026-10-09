import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check } from "lucide-react";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";

const decisionLabel: Record<string, string> = { granted: "Granted", denied: "Denied", invalid: "Invalid", already_checked_in: "Already in" };

type Props = { params: Promise<{ eventId: string }> };

export default async function EventOverviewPage({ params }: Props) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase } = await requireOrganizerMembership(
    `/organizer/events/${eventId}`,
  );

  const [
    credentialsResult,
    stationsResult,
    scansResult,
    activityCountResult,
    benefitCountResult,
    ticketCountResult,
    figmaLinkResult,
    liveDesignResult,
    pendingResult,
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
    supabase.from("figma_plugin_links").select("id", { count: "exact", head: true }).eq("event_id", eventId).is("revoked_at", null),
    supabase.from("event_studio_documents").select("kind").eq("event_id", eventId).eq("status", "published"),
    supabase.from("attendees").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("approval_status", "pending"),
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
    { label: "Registered", value: event.attendeeCount, note: event.attendeeCount === 1 ? "attendee" : "attendees" },
    { label: "Checked in", value: event.checkedInCount, note: event.attendeeCount ? `${Math.round((event.checkedInCount / event.attendeeCount) * 100)}% of registered` : "no one yet" },
    {
      label: "QR active",
      value: activeQr,
      note: `${unclaimedQr} unlinked`,
    },
    { label: "Denied", value: denied, note: "recent scans" },
  ];

  // Required steps mirror transition_event's publish checks; the rest follow the Figma-only flow.
  const base = `/organizer/events/${eventId}`;
  const liveKinds = new Set((liveDesignResult.data ?? []).map((item) => item.kind));
  const checklist = [
    { done: !!(event.venue && event.startsAt && event.endsAt), title: "Add venue and dates", href: `${base}/settings`, required: true },
    { done: (ticketCountResult.count ?? 0) > 0, title: "Create a ticket type", href: `${base}/people`, required: true },
    { done: !!((event.heroImageUrl || event.posterUrl) && event.logoUrl), title: "Add banner and logo", href: `${base}/settings`, required: false },
    { done: (figmaLinkResult.count ?? 0) > 0, title: "Pair a Figma file", href: `${base}/design`, required: false },
    { done: liveKinds.has("website"), title: "Publish your Figma website", href: `${base}/design`, required: false },
    { done: ["digital", "id_card", "wristband"].some((kind) => liveKinds.has(kind)), title: "Publish a pass design", href: `${base}/design`, required: false },
    { done: activeStations > 0, title: "Set up a scanner station", href: `${base}/access`, required: false },
    { done: event.status === "published", title: "Publish the event", href: `${base}/settings`, required: true },
  ];
  const remaining = checklist.filter((item) => !item.done).length;

  return (
    <>
      {(pendingResult.count ?? 0) > 0 && (
        <Link href={`${base}/people`} className="ui-callout">
          <span className="ui-badge ui-badge-warning">{pendingResult.count}</span>
          <span><strong>{pendingResult.count === 1 ? "1 registration is" : `${pendingResult.count} registrations are`} waiting for approval</strong><small>Review them in People</small></span>
          <ArrowUpRight size={18} />
        </Link>
      )}

      <section className="ui-grid ui-grid-4" aria-label="Event overview">
        {metrics.map(({ label, value, note }) => (
          <div className="ui-stat" key={label}><span>{label}</span><strong>{Number(value).toLocaleString("en-US")}</strong><small>{note}</small></div>
        ))}
      </section>

      <div className="ui-split ui-section">
        <section className="ui-card" aria-labelledby="checklist-title">
          <div className="ui-sectionhead">
            <div>
              <h2 id="checklist-title" className="ui-h2">{remaining ? `${remaining} ${remaining > 1 ? "steps" : "step"} left` : "Ready for the day"}</h2>
              <p>Required steps unlock publishing. The rest make check-in smoother.</p>
            </div>
          </div>
          <ol className="ui-checklist">
            {checklist.map(({ done, title, href, required }) => (
              <li key={title} data-done={done || undefined}>
                <Link href={href}>
                  <span className="ui-check" aria-hidden="true">{done && <Check size={13} strokeWidth={3} />}</span>
                  <span className="ui-checklist-title">{title}</span>
                  {!done && <span className={required ? "ui-badge ui-badge-warning" : "ui-badge"}>{required ? "Required" : "Optional"}</span>}
                  <ArrowUpRight size={15} className="ui-checklist-arrow" />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="stations-title">
          <div className="ui-sectionhead">
            <div><h2 id="stations-title" className="ui-h2">Scanner stations</h2><p>{activeStations} of {stations.length} active</p></div>
            <Link href={`${base}/access`} className="ui-link">Manage <ArrowUpRight size={14} /></Link>
          </div>
          {stations.length ? (
            <ul className="ui-list">
              {stations.slice(0, 5).map((station) => (
                <li key={station.id}>
                  <Link href={`/scan/${station.id}`} className="ui-listrow">
                    <span className="ui-listrow-main"><strong>{station.name}</strong><small>Open on a phone to scan</small></span>
                    <span className="ui-listrow-end"><span className={station.is_active ? "ui-badge ui-badge-success" : "ui-badge"}>{station.is_active ? "Active" : "Paused"}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ui-empty"><strong>No stations yet</strong><p>Add a check-in station in Access, then open it on any phone.</p><Link href={`${base}/access`} className="ui-btn ui-btn-secondary ui-btn-sm">Add a station</Link></div>
          )}
        </section>
      </div>

      <section className="ui-section" aria-labelledby="scans-title">
        <div className="ui-sectionhead">
          <div>
            <h2 id="scans-title" className="ui-h2">Latest scans</h2>
            <p>{activityCountResult.count ?? 0} activity logs and {benefitCountResult.count ?? 0} benefit claims so far.</p>
          </div>
        </div>
        {scans.length ? (
          <ul className="ui-list">
            {scans.map((scan) => (
              <li key={scan.id} className="ui-listrow">
                <span className="ui-listrow-main">
                  <strong>{scan.attendee_id ? attendeeName.get(scan.attendee_id) ?? "Attendee" : "Unknown pass"}</strong>
                  <small>{(scan.scanner_station_id && stationName.get(scan.scanner_station_id)) || "Manual check-in"}{scan.scanned_at ? `, ${new Date(scan.scanned_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}` : ""}</small>
                </span>
                <span className={scan.decision === "granted" ? "ui-badge ui-badge-success" : scan.decision === "already_checked_in" ? "ui-badge ui-badge-warning" : "ui-badge ui-badge-danger"}>{decisionLabel[scan.decision] ?? scan.decision.replaceAll("_", " ")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="ui-empty"><strong>No scans yet</strong><p>Scans from every station show up here as guests arrive.</p></div>
        )}
      </section>
    </>
  );
}
