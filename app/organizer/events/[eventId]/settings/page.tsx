import { notFound } from "next/navigation";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { DateTimeField, FormattedNumberInput } from "@/components/form-fields";
import { deleteEvent, setEventStatus, updateEvent } from "@/app/organizer/events/actions";
import { EventSubdomainPanel } from "@/components/event-subdomain-panel";
import { EventBranding } from "@/components/event-branding";
import { saveEventAccess } from "@/app/organizer/events/people-actions";

type Props = { params: Promise<{ eventId: string }>; searchParams: Promise<{ error?: string }> };

function inputClass() {
  return "ui-input";
}

export default async function EventSettingsPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase } = await requireOrganizerMembership(`/organizer/events/${eventId}/settings`);
  const [{ data: versions }, attendees, credentials, scans, activities, benefits] = await Promise.all([
    supabase.from("event_publications").select("version,published_at").eq("event_id", eventId).order("version", { ascending: false }).limit(10),
    supabase.from("attendees").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("qr_credentials").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("scan_logs").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("activity_logs").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("benefit_claims").select("id", { count: "exact", head: true }).eq("event_id", eventId),
  ]);
  const { data: address } = await supabase.from("event_subdomains").select("label").eq("event_id", eventId).maybeSingle();
  const canDelete = event.status === "draft" && !(versions?.length || attendees.count || credentials.count || scans.count || activities.count || benefits.count);
  const { error } = await searchParams;
  const errors: Record<string, string> = {
    incomplete_event_configuration: "Add a name, slug, venue, start and end dates. The end must be after the start.",
    ticket_required_to_publish: "Create at least one ticket category before publishing.",
    capacity_below_registration: "Capacity cannot be lower than the number already registered.",
    claim_mode_locked_after_registration: "Claim mode cannot change after registration begins.",
    no_draft_changes: "Make a draft change before publishing another version.",
    version_not_found: "That version is unavailable.",
    delete: "This event has history or dependencies and cannot be deleted. Archive it instead.",
    save: "Changes could not be saved. Check the fields and try again.",
    transition: "The status could not be changed. Review the configuration and try again.",
  };

  const statusLabel = event.status === "published" ? "Live" : event.status === "archived" ? "Archived" : "Draft";

  return (
    <div className="ui-settings">
      {error && <p role="alert" className="ui-notice ui-notice-danger">{errors[error] ?? errors.transition}</p>}

      <section className="ui-card ui-settings-card" aria-labelledby="details-title">
        <div className="ui-settings-side">
          <h2 id="details-title" className="ui-h3">Event details</h2>
          <p>While the event is live, these are saved as a draft. Guests see them after you publish a new version.</p>
        </div>
        <form action={updateEvent} className="ui-formgrid">
          <input type="hidden" name="eventId" value={event.id} />
          <label className="ui-field ui-span-2"><span>Name</span><input className={inputClass()} name="name" defaultValue={event.name} required /></label>
          <label className="ui-field"><span>Link name</span><input className={inputClass()} name="slug" defaultValue={event.slug} required /><small>passflow.my.id/e/{event.slug}</small></label>
          <label className="ui-field"><span>Capacity</span><FormattedNumberInput name="capacity" defaultValue={event.capacity ?? ""} min={0} className={inputClass()} placeholder="Unlimited" /></label>
          <label className="ui-field ui-span-2"><span>Venue</span><input className={inputClass()} name="venue" defaultValue={event.venue} /></label>
          <div className="ui-span-2 ui-dates"><DateTimeField name="startsAt" defaultValue={event.startsAt} label="Starts" /><DateTimeField name="endsAt" defaultValue={event.endsAt} label="Ends" /></div>
          <label className="ui-field ui-span-2"><span>Description</span><textarea className="ui-textarea" rows={4} name="description" defaultValue={event.description} /></label>
          <div className="ui-span-2 ui-formactions"><button className="ui-btn ui-btn-primary" type="submit" disabled={event.status === "archived"}>Save changes</button></div>
        </form>
      </section>

      <section className="ui-card ui-settings-card" aria-labelledby="publish-title">
        <div className="ui-settings-side">
          <h2 id="publish-title" className="ui-h3">Publishing</h2>
          <p>Publishing makes your saved details public. Tickets, gates and access rules apply immediately and never need publishing.</p>
        </div>
        <div className="ui-stack">
          <div className="ui-tile ui-publish">
            <div>
              <span className={event.status === "published" ? "ui-badge ui-badge-success" : "ui-badge"}>{statusLabel}</span>
              <p>{event.publishedVersion ? `Version ${event.publishedVersion} is public.` : "Not published yet."}{event.hasDraftChanges ? " You have unpublished changes." : ""}</p>
            </div>
            <div className="ui-row">
              {event.status !== "archived" && <form action={setEventStatus}><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="action" value="archive" /><button className="ui-btn ui-btn-ghost ui-btn-sm" type="submit">Archive</button></form>}
              {event.status !== "archived" && <form action={setEventStatus}><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="action" value="publish" /><button className="ui-btn ui-btn-primary ui-btn-sm" type="submit">{event.status === "published" ? "Publish changes" : "Publish event"}</button></form>}
              {event.status === "archived" && <form action={setEventStatus}><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="action" value="reopen" /><button className="ui-btn ui-btn-secondary ui-btn-sm" type="submit">Reopen as draft</button></form>}
            </div>
          </div>
          {!!versions?.length && <div className="ui-versions"><span className="ui-label">Earlier versions</span><div className="ui-row">{versions.map((version) => <form action={setEventStatus} key={version.version}>
            <input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="action" value="restore" /><input type="hidden" name="version" value={version.version} />
            <button className="ui-btn ui-btn-secondary ui-btn-sm" disabled={event.status === "archived"} type="submit" title="Restore into the draft">Restore v{version.version}</button>
          </form>)}</div></div>}
        </div>
      </section>

      <section className="ui-card ui-settings-card" aria-labelledby="access-title">
        <div className="ui-settings-side">
          <h2 id="access-title" className="ui-h3">Who can find and join</h2>
          <p>These apply right away, without publishing a new version.</p>
        </div>
        <form action={saveEventAccess} className="access-form">
          <input type="hidden" name="eventId" value={event.id} />
          <fieldset className="ui-fieldset">
            <legend className="ui-legend">Visibility</legend>
            <div className="ui-options ui-options-2">
              <label className="ui-option-radio"><input type="radio" name="visibility" value="public" defaultChecked={event.visibility !== "private"} /><span><strong>Public</strong><small>Listed in Discover and on the PassFlow homepage.</small></span></label>
              <label className="ui-option-radio"><input type="radio" name="visibility" value="private" defaultChecked={event.visibility === "private"} /><span><strong>Private</strong><small>Hidden from Discover. Only people with the link can open it.</small></span></label>
            </div>
          </fieldset>
          <fieldset className="ui-fieldset">
            <legend className="ui-legend">Registration</legend>
            <div className="ui-options ui-options-2">
              <label className="ui-option-radio"><input type="radio" name="registration" value="open" defaultChecked={event.registrationOpen !== false} /><span><strong>Open</strong><small>People can register now.</small></span></label>
              <label className="ui-option-radio"><input type="radio" name="registration" value="soon" defaultChecked={event.registrationOpen === false} /><span><strong>Coming soon</strong><small>The page is live but registration is closed. Guests you add still get passes.</small></span></label>
            </div>
          </fieldset>
          <label className="ui-switch-row"><input type="checkbox" name="approval" defaultChecked={event.requiresApproval === true} /><span><strong>Approve each registration</strong><small>New registrations wait in People. Guests get their pass and an email when you approve.</small></span></label>
          <div className="ui-formactions"><button type="submit" className="ui-btn ui-btn-primary">Save access</button></div>
        </form>
      </section>

      <EventBranding event={event} />
      <EventSubdomainPanel eventId={eventId} current={address?.label ?? ""} suggestion={event.slug} enabled={process.env.PASSFLOW_EVENT_SUBDOMAINS_ENABLED === "true"} />

      <section className="ui-card ui-settings-card ui-danger" aria-labelledby="delete-title">
        <div className="ui-settings-side">
          <h2 id="delete-title" className="ui-h3">Delete event</h2>
          <p>{canDelete ? "Only unused drafts can be deleted. This cannot be undone." : "Locked because this event is live, archived or has history. Archive it to keep its records."}</p>
        </div>
        {canDelete ? <form action={deleteEvent} className="ui-row ui-delete">
          <input type="hidden" name="eventId" value={event.id} />
          <label className="ui-field"><span>Type <code className="ui-mono">{event.slug}</code> to confirm</span><input className={inputClass()} name="confirmation" placeholder={event.slug} /></label>
          <button className="ui-btn ui-btn-danger" type="submit">Delete event</button>
        </form> : <p className="ui-small">{`${attendees.count ?? 0} attendees, ${credentials.count ?? 0} QR codes, ${scans.count ?? 0} scans, ${activities.count ?? 0} activity logs and ${benefits.count ?? 0} benefit claims are on record.`}</p>}
      </section>
    </div>
  );
}
