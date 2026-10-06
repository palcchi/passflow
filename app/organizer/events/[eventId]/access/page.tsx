import { ResourceManager, DeleteAccessRule } from "@/components/resource-manager";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { QrCodeGenerator } from "@/components/qr-code-generator";
import { SmartSelect } from "@/components/form-fields";
import { QrDeliveryEditor } from "@/components/qr-delivery-editor";
import { CredentialManager } from "@/components/credential-manager";
import { FormDialog, PopupPanel } from "@/components/form-dialog";
import {
  createAccessRule,
  createStation,
  createZone,
  saveClaimMode,
} from "@/app/organizer/events/actions";

type Props = { params: Promise<{ eventId: string }>; searchParams: Promise<{ error?: string }> };

export default async function EventAccessPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase } = await requireOrganizerMembership(
    `/organizer/events/${eventId}/access`,
  );

  const [
    credentialsResult,
    ticketsResult,
    zonesResult,
    rulesResult,
    stationsResult,
  ] = await Promise.all([
    supabase
      .from("qr_credentials")
      .select("id,display_code,status,claimed_at,revoked_at,attendees(name)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("ticket_types")
      .select("id,name")
      .eq("event_id", eventId)
      .order("created_at"),
    supabase
      .from("access_zones")
      .select("id,name,code,description,is_active")
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
  const unclaimed = credentials.filter(
    (item) => item.status === "unclaimed",
  ).length;
  const revoked = credentials.filter((item) => item.status === "revoked").length;
  const claimMode = event.qrConfig.claimMode;
  const { error } = await searchParams;

  return (
    <>
      <QrDeliveryEditor event={event}>
        {error === "claim_mode_locked" && <p role="alert" className="camera-feedback">Claim mode cannot change after attendees have registered. Existing passes stay valid.</p>}
        <form action={saveClaimMode} className="claim-mode-options">
          <input type="hidden" name="eventId" value={eventId} />
          <button
            className="claim-mode-option"
            data-active={claimMode === "automatic"}
            type="submit"
            name="claimMode"
            value="automatic"
          >
            <strong>Automatic on registration</strong>
            <span>
              Attendees receive a QR credential immediately. Ideal for digital
              passes and ID cards that already display attendee names.
            </span>
          </button>
          <button
            className="claim-mode-option"
            data-active={claimMode === "claim"}
            type="submit"
            name="claimMode"
            value="claim"
          >
            <strong>Claim after registration</strong>
            <span>
              Attendees register first, then scan a physical QR code to link
              wristbands or credentials that have already been printed.
            </span>
          </button>
        </form>
      </QrDeliveryEditor>

      <section className="event-admin-section">
        <div className="event-admin-section-head event-admin-section-head-wrap">
          <div>
            <span className="section-kicker">QR credentials</span>
            <h2>Codes</h2>
            <p>
              {claimMode === "claim"
                ? "Generate a batch for wristbands or physical credentials that attendees will claim."
                : "Batches remain optional. When available, new registrations can use a batch code; otherwise, PassFlow creates credentials automatically."}
            </p>
          </div>
          <div className="event-admin-head-actions">
            <span className="event-admin-section-count">{unclaimed} unclaimed</span>
            <span className="event-admin-section-count">{active} active</span>
            <span className="event-admin-section-count">{revoked} revoked</span>
            <PopupPanel trigger="Generate codes" title="Generate QR codes" description="Create a numbered batch for wristbands or cards you print before anyone owns them.">
              <QrCodeGenerator eventId={eventId} />
            </PopupPanel>
            <Link className="button button-dark" href={`/organizer/events/${eventId}/wristbands/print`}>
              Preview & export
            </Link>
          </div>
        </div>

        <CredentialManager eventId={eventId} credentials={credentials.map(({ attendees, ...c }) => ({ ...c, owner: (Array.isArray(attendees) ? attendees[0] : attendees)?.name ?? null }))} />
      </section>

      <section className="event-admin-section">
        <div className="event-admin-section-head">
          <div>
            <span className="section-kicker">Access control</span>
            <h2>Zones, rules & scanner stations</h2>
            <p>Zones are the places you guard, rules decide which pass category may enter, and stations are the phones that scan.</p>
          </div>
        </div>

        <div className="event-admin-access-grid">
          <div className="event-admin-subpanel">
            <div className="event-admin-subpanel-head">
              <div><strong>Zones</strong><small>{zones.length} {zones.length === 1 ? "zone" : "zones"}</small></div>
              <FormDialog trigger="Add zone" title="Add zone" description="A place with its own entry, like a VIP lounge or backstage." action={createZone} submitLabel="Add zone">
                <input type="hidden" name="eventId" value={eventId} />
                <label>Name<input name="name" placeholder="VIP Lounge" required maxLength={100} /></label>
                <label>Code <small>Optional, made from the name</small><input name="code" placeholder="VIP_LOUNGE" maxLength={40} /></label>
              </FormDialog>
            </div>
            <ResourceManager eventId={eventId} kind="zone" records={zones} />
          </div>

          <div className="event-admin-subpanel">
            <div className="event-admin-subpanel-head">
              <div><strong>Access rules</strong><small>{rules.length} {rules.length === 1 ? "rule" : "rules"}</small></div>
              <FormDialog trigger="Add rule" title="Add access rule" description="Choose which pass category may enter a zone. Without an allow rule, entry is denied." action={createAccessRule} submitLabel="Save rule">
                <input type="hidden" name="eventId" value={eventId} />
                <label>Zone<SmartSelect name="zoneId" value="" options={[{ value: "", label: "Choose a zone" }, ...zones.map((zone) => ({ value: zone.id, label: zone.name }))]} /></label>
                <label>Pass category<SmartSelect name="ticketTypeId" value="" options={[{ value: "", label: "Choose a category" }, ...tickets.map((ticket) => ({ value: ticket.id, label: ticket.name }))]} /></label>
                <label>Access<SmartSelect name="allowed" value="true" options={[{ value: "true", label: "Allow" }, { value: "false", label: "Deny" }]} /></label>
              </FormDialog>
            </div>
            <div className="resource-manager">
              {rules.map((rule) => (
                <div className="resource-record" key={rule.id}>
                  <span>
                    <strong>{zones.find((zone) => zone.id === rule.zone_id)?.name ?? "Zone"}</strong>
                    <small>{ticketName.get(rule.ticket_type_id) ?? "Pass"} · {rule.allowed ? "Allow" : "Deny"}</small>
                  </span>
                  <DeleteAccessRule eventId={eventId} id={rule.id}/>
                </div>
              ))}
              {!rules.length && <p className="event-admin-table-empty">No rules yet. Zones deny everyone until you add one.</p>}
            </div>
          </div>

          <div className="event-admin-subpanel">
            <div className="event-admin-subpanel-head">
              <div><strong>Stations</strong><small>{stations.length} {stations.length === 1 ? "scanner" : "scanners"}</small></div>
              <FormDialog trigger="Add station" title="Add scanner station" description="A gate or desk where crew scan passes with a phone." action={createStation} submitLabel="Create station">
                <input type="hidden" name="eventId" value={eventId} />
                <label>Name<input name="name" placeholder="Main Entrance" required maxLength={100} /></label>
                <label>Link name <small>Optional</small><input name="slug" placeholder="main-entrance" maxLength={100} /></label>
                <label>Scanner mode<SmartSelect name="mode" value="check_in" options={[{ value: "check_in", label: "Check-in" }, { value: "zone_access", label: "Zone access" }, { value: "activity", label: "Activity" }, { value: "claim", label: "Benefit claim" }]} /></label>
                <label>Zone<SmartSelect name="zoneId" value="" options={[{ value: "", label: "No zone" }, ...zones.map((zone) => ({ value: zone.id, label: zone.name }))]} /></label>
                <label>Activity code <small>For activity mode</small><input name="activityCode" placeholder="WORKSHOP_A" maxLength={40} /></label>
                <label>Benefit code <small>For benefit claim mode</small><input name="benefitCode" placeholder="MERCH_PACK" maxLength={40} /></label>
              </FormDialog>
            </div>
            <ResourceManager eventId={eventId} kind="station" records={stations} zones={zones} />
          </div>
        </div>
      </section>
    </>
  );
}
