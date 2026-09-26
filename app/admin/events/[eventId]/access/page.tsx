import Link from "next/link";
import { notFound } from "next/navigation";
import { QrCode, ScanLine, ShieldCheck, Workflow } from "lucide-react";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { EventAdminChrome, eventAdminProfile } from "@/components/event-admin-chrome";
import { QrCodeGenerator } from "@/components/qr-code-generator";
import { SmartSelect } from "@/components/form-fields";
import {
  createAccessRule,
  createStation,
  createZone,
  revokeCredential,
  toggleStation,
} from "@/app/admin/actions";

type Props = { params: Promise<{ eventId: string }> };

function inputClass() {
  return "event-admin-input";
}

export default async function EventAccessPage({ params }: Props) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase, user } = await requireOrganizerMembership(`/admin/events/${eventId}/access`);
  const [credentialsResult, ticketsResult, zonesResult, rulesResult, stationsResult] = await Promise.all([
    supabase
      .from("qr_credentials")
      .select("id,display_code,status,attendee_id,claimed_at,revoked_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("ticket_types")
      .select("id,name")
      .eq("event_id", eventId)
      .order("created_at"),
    supabase
      .from("access_zones")
      .select("id,name,code,description")
      .eq("event_id", eventId)
      .order("created_at"),
    supabase
      .from("access_rules")
      .select("id,zone_id,ticket_type_id,allowed")
      .eq("event_id", eventId),
    supabase
      .from("scanner_stations")
      .select("id,name,slug,mode,zone_id,config,is_active")
      .eq("event_id", eventId)
      .order("created_at"),
  ]);

  const credentials = credentialsResult.data ?? [];
  const tickets = ticketsResult.data ?? [];
  const zones = zonesResult.data ?? [];
  const rules = rulesResult.data ?? [];
  const stations = stationsResult.data ?? [];
  const ticketName = new Map(tickets.map((ticket) => [ticket.id, ticket.name]));
  const active = credentials.filter((item) => item.status === "active").length;
  const unclaimed = credentials.filter((item) => item.status === "unclaimed").length;
  const revoked = credentials.filter((item) => item.status === "revoked").length;

  return (
    <EventAdminChrome event={event} profile={eventAdminProfile(user)}>
      <section className="event-admin-section liquid-panel">
        <div className="event-admin-section-head event-admin-section-head-wrap">
          <div>
            <span className="section-kicker">Access</span>
            <h2>QR codes</h2>
            <p>Custom prefix, cari range kosong, lalu generate credential tanpa mengubah token keamanan QR.</p>
          </div>
          <div className="event-admin-head-actions">
            <span className="event-admin-section-count">{unclaimed} unclaimed</span>
            <span className="event-admin-section-count">{active} active</span>
            <span className="event-admin-section-count">{revoked} revoked</span>
            <Link className="button button-ghost" href={`/admin/events/${event.id}/wristbands/print`}>
              Print QR batch
            </Link>
          </div>
        </div>

        <QrCodeGenerator eventId={event.id} />

        <div className="event-admin-credential-grid">
          {credentials.slice(0, 32).map((qr) => (
            <div key={qr.id} className="event-admin-credential-card">
              <div>
                <strong>{qr.display_code ?? "QR"}</strong>
                <span className={`event-admin-state ${qr.status === "active" ? "is-success" : ""}`}>
                  {qr.status}
                </span>
              </div>
              {qr.status === "active" && (
                <form action={revokeCredential}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="credentialId" value={qr.id} />
                  <button type="submit" className="event-admin-danger-link">Revoke</button>
                </form>
              )}
            </div>
          ))}
          {!credentials.length && (
            <div className="event-admin-empty-card">
              <QrCode size={20} />
              <strong>Belum ada QR</strong>
              <span>Gunakan generator di atas untuk membuat batch pertama.</span>
            </div>
          )}
        </div>
      </section>

      <section className="event-admin-section liquid-panel">
        <div className="event-admin-section-head">
          <div>
            <span className="section-kicker">Access control</span>
            <h2>Zones, rules & scanner stations</h2>
            <p>Bangun alur akses fisik event tanpa menjejalkan semuanya ke halaman utama.</p>
          </div>
          <span className="event-admin-section-icon"><Workflow size={18} /></span>
        </div>

        <div className="event-admin-access-grid">
          <div className="event-admin-subpanel">
            <div className="event-admin-subpanel-head">
              <span className="event-admin-list-icon"><ShieldCheck size={15} /></span>
              <div><strong>Zones</strong><small>{zones.length} zone</small></div>
            </div>
            <div className="event-admin-stack">
              {zones.map((zone) => (
                <div className="event-admin-row-card" key={zone.id}>
                  <strong>{zone.name}</strong>
                  <span>{zone.code}</span>
                </div>
              ))}
            </div>
            <form action={createZone} className="event-admin-stack event-admin-subform">
              <input type="hidden" name="eventId" value={event.id} />
              <input className={inputClass()} name="name" placeholder="VIP Lounge" required />
              <input className={inputClass()} name="code" placeholder="VIP_LOUNGE" />
              <button className="button button-ghost" type="submit">Add zone</button>
            </form>
          </div>

          <div className="event-admin-subpanel">
            <div className="event-admin-subpanel-head">
              <span className="event-admin-list-icon"><Workflow size={15} /></span>
              <div><strong>Access rules</strong><small>{rules.length} rule</small></div>
            </div>
            <div className="event-admin-stack">
              {rules.map((rule) => (
                <div className="event-admin-row-card" key={rule.id}>
                  <strong>{zones.find((zone) => zone.id === rule.zone_id)?.name ?? "Zone"}</strong>
                  <span>{ticketName.get(rule.ticket_type_id) ?? "Pass"} · {rule.allowed ? "ALLOW" : "DENY"}</span>
                </div>
              ))}
            </div>
            <form action={createAccessRule} className="event-admin-stack event-admin-subform">
              <input type="hidden" name="eventId" value={event.id} />
              <SmartSelect
                name="zoneId"
                value=""
                options={[{ value: "", label: "Zone" }, ...zones.map((zone) => ({ value: zone.id, label: zone.name }))]}
              />
              <SmartSelect
                name="ticketTypeId"
                value=""
                options={[{ value: "", label: "Pass type" }, ...tickets.map((ticket) => ({ value: ticket.id, label: ticket.name }))]}
              />
              <SmartSelect
                name="allowed"
                value="true"
                options={[{ value: "true", label: "Allow" }, { value: "false", label: "Deny" }]}
              />
              <button className="button button-ghost" type="submit">Save rule</button>
            </form>
          </div>

          <div className="event-admin-subpanel">
            <div className="event-admin-subpanel-head">
              <span className="event-admin-list-icon"><ScanLine size={15} /></span>
              <div><strong>Stations</strong><small>{stations.length} scanner</small></div>
            </div>
            <div className="event-admin-stack">
              {stations.map((station) => (
                <div className="event-admin-row-card event-admin-station-row" key={station.id}>
                  <Link href={`/scan/${station.id}`}>{station.name}</Link>
                  <span>{station.mode}</span>
                  <form action={toggleStation}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="stationId" value={station.id} />
                    <input type="hidden" name="isActive" value={station.is_active ? "false" : "true"} />
                    <button className="event-admin-text-action" type="submit">
                      {station.is_active ? "Set standby" : "Activate"}
                    </button>
                  </form>
                </div>
              ))}
            </div>
            <form action={createStation} className="event-admin-stack event-admin-subform">
              <input type="hidden" name="eventId" value={event.id} />
              <input className={inputClass()} name="name" placeholder="Main Entrance" required />
              <input className={inputClass()} name="slug" placeholder="main-entrance" />
              <SmartSelect
                name="mode"
                value="check_in"
                options={[
                  { value: "check_in", label: "Check-in" },
                  { value: "zone_access", label: "Zone access" },
                  { value: "activity", label: "Activity" },
                  { value: "claim", label: "Benefit claim" },
                ]}
              />
              <SmartSelect
                name="zoneId"
                value=""
                options={[{ value: "", label: "No zone" }, ...zones.map((zone) => ({ value: zone.id, label: zone.name }))]}
              />
              <input className={inputClass()} name="activityCode" placeholder="Activity code, optional" />
              <input className={inputClass()} name="benefitCode" placeholder="Benefit code, optional" />
              <button className="button button-dark" type="submit">Create station</button>
            </form>
          </div>
        </div>
      </section>
    </EventAdminChrome>
  );
}
