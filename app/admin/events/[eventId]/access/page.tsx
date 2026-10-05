import { ActionFeedbackForm } from "@/components/action-feedback-form";
import { ResourceManager, DeleteAccessRule } from "@/components/resource-manager";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { QrCodeGenerator } from "@/components/qr-code-generator";
import { SmartSelect } from "@/components/form-fields";
import { QrDeliveryEditor } from "@/components/qr-delivery-editor";
import {
  createAccessRule,
  createStation,
  createZone,
  revokeCredential,
  saveClaimMode,
} from "@/app/admin/actions";

type Props = { params: Promise<{ eventId: string }>; searchParams: Promise<{ error?: string }> };

function inputClass() {
  return "event-admin-input";
}

export default async function EventAccessPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase } = await requireOrganizerMembership(
    `/admin/events/${eventId}/access`,
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
            <Link
              className="button button-ghost"
              href={`/admin/events/${eventId}/wristbands/print`}
            >
              Print QR batch
            </Link>
          </div>
        </div>

        <QrCodeGenerator eventId={eventId} />

        <div className="event-admin-credential-grid">
          {credentials.slice(0, 32).map((qr) => (
            <div key={qr.id} className="event-admin-credential-card">
              <div>
                <strong>{qr.display_code ?? "QR"}</strong>
                <span
                  className={`event-admin-state ${qr.status === "active" ? "is-success" : ""}`}
                >
                  {qr.status}
                </span>
              </div>
              {qr.status === "active" && (
                <form action={revokeCredential}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input
                    type="hidden"
                    name="credentialId"
                    value={qr.id}
                  />
                  <button
                    type="submit"
                    className="event-admin-danger-link"
                  >
                    Revoke
                  </button>
                </form>
              )}
            </div>
          ))}
          {!credentials.length && (
            <div className="event-admin-empty-card">
              <strong>No QR credentials yet</strong>
              <span>
                Generate a batch when using physical credentials, or leave it
                Automatic mode creates a credential during registration.
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="event-admin-section">
        <div className="event-admin-section-head">
          <div>
            <span className="section-kicker">Access control</span>
            <h2>Zones, rules & scanner stations</h2>
            <p>
              Configure access zones and scanner stations without unnecessary
              membantu pekerjaan.
            </p>
          </div>
        </div>

        <div className="event-admin-access-grid">
          <div className="event-admin-subpanel">
            <div className="event-admin-subpanel-head">
              <div>
                <strong>Zones</strong>
                <small>{zones.length} zone</small>
              </div>
            </div>
            <div className="event-admin-stack">
              <ResourceManager eventId={eventId} kind="zone" records={zones} />
            </div>
            <ActionFeedbackForm
              action={createZone}
              className="event-admin-stack event-admin-subform"
            >
              <input type="hidden" name="eventId" value={eventId} />
              <input
                className={inputClass()}
                name="name"
                placeholder="VIP Lounge"
                required
              />
              <input
                className={inputClass()}
                name="code"
                placeholder="VIP_LOUNGE"
              />
              <button className="button button-ghost" type="submit">
                Add zone
              </button>
            </ActionFeedbackForm>
          </div>

          <div className="event-admin-subpanel">
            <div className="event-admin-subpanel-head">
              <div>
                <strong>Access rules</strong>
                <small>{rules.length} rule</small>
              </div>
            </div>
            <div className="event-admin-stack">
              {rules.map((rule) => (
                <div className="event-admin-row-card" key={rule.id}>
                  <strong>
                    {zones.find((zone) => zone.id === rule.zone_id)?.name ??
                      "Zone"}
                  </strong>
                  <span>
                    {ticketName.get(rule.ticket_type_id) ?? "Pass"} ·{" "}
                    {rule.allowed ? "ALLOW" : "DENY"}
                  </span>
                  <DeleteAccessRule eventId={eventId} id={rule.id}/>
                </div>
              ))}
            </div>
            <ActionFeedbackForm
              action={createAccessRule}
              className="event-admin-stack event-admin-subform"
            >
              <input type="hidden" name="eventId" value={eventId} />
              <SmartSelect
                name="zoneId"
                value=""
                options={[
                  { value: "", label: "Zone" },
                  ...zones.map((zone) => ({
                    value: zone.id,
                    label: zone.name,
                  })),
                ]}
              />
              <SmartSelect
                name="ticketTypeId"
                value=""
                options={[
                  { value: "", label: "Pass type" },
                  ...tickets.map((ticket) => ({
                    value: ticket.id,
                    label: ticket.name,
                  })),
                ]}
              />
              <SmartSelect
                name="allowed"
                value="true"
                options={[
                  { value: "true", label: "Allow" },
                  { value: "false", label: "Deny" },
                ]}
              />
              <button className="button button-ghost" type="submit">
                Save rule
              </button>
            </ActionFeedbackForm>
          </div>

          <div className="event-admin-subpanel">
            <div className="event-admin-subpanel-head">
              <div>
                <strong>Stations</strong>
                <small>{stations.length} scanner</small>
              </div>
            </div>
            <div className="event-admin-stack">
              <ResourceManager eventId={eventId} kind="station" records={stations} zones={zones} />
            </div>
            <ActionFeedbackForm
              action={createStation}
              className="event-admin-stack event-admin-subform"
            >
              <input type="hidden" name="eventId" value={eventId} />
              <input
                className={inputClass()}
                name="name"
                placeholder="Main Entrance"
                required
              />
              <input
                className={inputClass()}
                name="slug"
                placeholder="main-entrance"
              />
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
                options={[
                  { value: "", label: "No zone" },
                  ...zones.map((zone) => ({
                    value: zone.id,
                    label: zone.name,
                  })),
                ]}
              />
              <input
                className={inputClass()}
                name="activityCode"
                placeholder="WORKSHOP_A (optional)"
              />
              <input
                className={inputClass()}
                name="benefitCode"
                placeholder="MERCH_PACK (optional)"
              />
              <button className="button button-dark" type="submit">
                Create station
              </button>
            </ActionFeedbackForm>
          </div>
        </div>
      </section>
    </>
  );
}
