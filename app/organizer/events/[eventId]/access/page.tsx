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
        {error === "claim_mode_locked" && <p role="alert" className="ui-notice ui-notice-danger ui-mb">Claim mode cannot change after attendees have registered. Existing passes stay valid.</p>}
        <form action={saveClaimMode} className="ui-options ui-options-2">
          <input type="hidden" name="eventId" value={eventId} />
          <button className="ui-option" aria-pressed={claimMode === "automatic"} type="submit" name="claimMode" value="automatic">
            <strong>Automatic on registration</strong>
            <small>Every attendee gets a QR the moment they register (or are approved). Best for digital passes and printed ID cards.</small>
          </button>
          <button className="ui-option" aria-pressed={claimMode === "claim"} type="submit" name="claimMode" value="claim">
            <strong>Claim after registration</strong>
            <small>Attendees register, then scan a printed wristband or card to link it to their account.</small>
          </button>
        </form>
      </QrDeliveryEditor>

      <section className="ui-section" aria-labelledby="codes-title">
        <div className="ui-sectionhead">
          <div>
            <h2 id="codes-title" className="ui-h2">QR codes</h2>
            <p>{unclaimed.toLocaleString("en-US")} unclaimed, {active.toLocaleString("en-US")} active, {revoked.toLocaleString("en-US")} revoked</p>
          </div>
          <div className="ui-row">
            <PopupPanel trigger="Generate codes" triggerClassName="ui-btn ui-btn-secondary ui-btn-sm" title="Generate QR codes" description="Create a numbered batch for wristbands or cards you print before anyone owns them.">
              <QrCodeGenerator eventId={eventId} />
            </PopupPanel>
            <Link className="ui-btn ui-btn-primary ui-btn-sm" href={`/organizer/events/${eventId}/wristbands/print`}>Print and export</Link>
          </div>
        </div>
        <CredentialManager eventId={eventId} credentials={credentials.map(({ attendees, ...c }) => ({ ...c, owner: (Array.isArray(attendees) ? attendees[0] : attendees)?.name ?? null }))} />
      </section>

      <section className="ui-section" aria-labelledby="control-title">
        <div className="ui-sectionhead">
          <div>
            <h2 id="control-title" className="ui-h2">Zones, rules and stations</h2>
            <p>Zones are places you guard, rules decide which pass category gets in, stations are the phones that scan.</p>
          </div>
        </div>
        <div className="ui-grid ui-grid-3 ui-align-start">
          <div className="ui-card ui-panel">
            <div className="ui-panelhead">
              <div><h3 className="ui-h3">Zones</h3><small>{zones.length} {zones.length === 1 ? "zone" : "zones"}</small></div>
              <FormDialog trigger="Add" triggerClassName="ui-btn ui-btn-secondary ui-btn-sm" title="Add zone" description="A place with its own entry, like a VIP lounge or backstage." action={createZone} submitLabel="Add zone">
                <input type="hidden" name="eventId" value={eventId} />
                <label>Name<input name="name" placeholder="VIP Lounge" required maxLength={100} /></label>
                <label>Code <small>Optional, made from the name</small><input name="code" placeholder="VIP_LOUNGE" maxLength={40} /></label>
              </FormDialog>
            </div>
            <ResourceManager eventId={eventId} kind="zone" records={zones} />
          </div>

          <div className="ui-card ui-panel">
            <div className="ui-panelhead">
              <div><h3 className="ui-h3">Access rules</h3><small>{rules.length} {rules.length === 1 ? "rule" : "rules"}</small></div>
              <FormDialog trigger="Add" triggerClassName="ui-btn ui-btn-secondary ui-btn-sm" title="Add access rule" description="Choose which pass category may enter a zone. Without an allow rule, entry is denied." action={createAccessRule} submitLabel="Save rule">
                <input type="hidden" name="eventId" value={eventId} />
                <label>Zone<SmartSelect name="zoneId" value="" options={[{ value: "", label: "Choose a zone" }, ...zones.map((zone) => ({ value: zone.id, label: zone.name }))]} /></label>
                <label>Pass category<SmartSelect name="ticketTypeId" value="" options={[{ value: "", label: "Choose a category" }, ...tickets.map((ticket) => ({ value: ticket.id, label: ticket.name }))]} /></label>
                <label>Access<SmartSelect name="allowed" value="true" options={[{ value: "true", label: "Allow" }, { value: "false", label: "Deny" }]} /></label>
              </FormDialog>
            </div>
            <ul className="ui-plain ui-resources">
              {rules.map((rule) => (
                <li className="ui-resource" key={rule.id}>
                  <span className="ui-listrow-main"><strong>{zones.find((zone) => zone.id === rule.zone_id)?.name ?? "Zone"}</strong><small>{ticketName.get(rule.ticket_type_id) ?? "Pass"}</small></span>
                  <span className={rule.allowed ? "ui-badge ui-badge-success" : "ui-badge ui-badge-danger"}>{rule.allowed ? "Allow" : "Deny"}</span>
                  <DeleteAccessRule eventId={eventId} id={rule.id} />
                </li>
              ))}
            </ul>
            {!rules.length && <p className="ui-small ui-panel-empty">No rules yet. Zones deny everyone until you add one.</p>}
          </div>

          <div className="ui-card ui-panel">
            <div className="ui-panelhead">
              <div><h3 className="ui-h3">Stations</h3><small>{stations.length} {stations.length === 1 ? "scanner" : "scanners"}</small></div>
              <FormDialog trigger="Add" triggerClassName="ui-btn ui-btn-secondary ui-btn-sm" title="Add scanner station" description="A gate or desk where crew scan passes with a phone." action={createStation} submitLabel="Create station">
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
