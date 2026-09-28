import { notFound } from "next/navigation";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { DateTimeField, FormattedNumberInput } from "@/components/form-fields";
import { deleteEvent, setEventStatus, updateEvent } from "@/app/admin/actions";

type Props = { params: Promise<{ eventId: string }>; searchParams: Promise<{ error?: string }> };

function inputClass() {
  return "event-admin-input";
}

export default async function EventSettingsPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase } = await requireOrganizerMembership(`/admin/events/${eventId}/settings`);
  const [{ data: versions }, attendees, credentials, scans, activities, benefits] = await Promise.all([
    supabase.from("event_publications").select("version,published_at").eq("event_id", eventId).order("version", { ascending: false }).limit(10),
    supabase.from("attendees").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("qr_credentials").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("scan_logs").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("activity_logs").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("benefit_claims").select("id", { count: "exact", head: true }).eq("event_id", eventId),
  ]);
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

  return (
    <>
      <section className="event-admin-section liquid-panel">
        <div className="event-admin-section-head">
          <div>
            <span className="section-kicker">Settings</span>
            <h2>Basics & lifecycle</h2>
            <p>Core event information, schedule, capacity, and publication status.</p>
          </div>
        </div>
        {error && <p role="alert" className="camera-feedback">{errors[error] ?? errors.transition}</p>}
        <p role="status"><strong>{event.status === "published" ? "Live" : event.status === "archived" ? "Archived" : "Draft"}</strong>
          {event.publishedVersion ? ` · published version ${event.publishedVersion}` : " · never published"}
          {event.hasDraftChanges ? " · unpublished changes saved" : ""}</p>
        <p>Basics and Quick Setup changes are saved as a draft while live. Public pages, registration and passes use the published settings until you publish. Tickets, gates and access rules are operational changes and apply immediately.</p>

        <form action={updateEvent} className="event-admin-form-grid">
          <input type="hidden" name="eventId" value={event.id} />
          <label className="event-admin-field is-wide">
            <span>Name</span>
            <input className={inputClass()} name="name" defaultValue={event.name} required />
          </label>
          <label className="event-admin-field">
            <span>Slug</span>
            <input className={inputClass()} name="slug" defaultValue={event.slug} required />
          </label>
          <label className="event-admin-field">
            <span>Capacity</span>
            <FormattedNumberInput
              name="capacity"
              defaultValue={event.capacity ?? ""}
              min={0}
              className={inputClass()}
            />
          </label>
          <label className="event-admin-field is-wide">
            <span>Venue</span>
            <input className={inputClass()} name="venue" defaultValue={event.venue} />
          </label>
          <DateTimeField name="startsAt" defaultValue={event.startsAt} label="Starts at" />
          <DateTimeField name="endsAt" defaultValue={event.endsAt} label="Ends at" />
          <label className="event-admin-field is-wide">
            <span>Description</span>
            <textarea
              className="event-admin-input event-admin-textarea"
              rows={4}
              name="description"
              defaultValue={event.description}
            />
          </label>
          <div className="event-admin-form-actions is-wide">
            <button className="button button-dark" type="submit" disabled={event.status === "archived"}>Save draft</button>
          </div>
        </form>

        <div className="event-admin-status-row">
          <div>
            <strong>Event status</strong>
            <span>Manage the event lifecycle across Draft, Published, and Archived states.</span>
          </div>
          <div className="event-admin-status-actions">
            {event.status !== "archived" && <form action={setEventStatus}>
              <input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="action" value="publish"/>
              <button className="event-admin-status-button is-active" type="submit">{event.status === "published" ? "Publish new version" : "Publish event"}</button>
            </form>}
            {event.status !== "archived" && <form action={setEventStatus}>
              <input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="action" value="archive"/>
              <button className="event-admin-status-button" type="submit">Archive event</button>
            </form>}
            {event.status === "archived" && <form action={setEventStatus}>
              <input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="action" value="reopen"/>
              <button className="event-admin-status-button" type="submit">Reopen as draft</button>
            </form>}
          </div>
        </div>
        {!!versions?.length && <div className="event-admin-status-row"><div><strong>Published versions</strong><span>Restore a snapshot into the draft, review it, then publish a new version.</span></div><div className="event-admin-status-actions">{versions.map(version => <form action={setEventStatus} key={version.version}>
          <input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="action" value="restore"/><input type="hidden" name="version" value={version.version}/>
          <button className="event-admin-status-button" disabled={event.status === "archived"} type="submit">Restore v{version.version}</button>
        </form>)}</div></div>}
      </section>

      <section className="event-admin-danger-zone">
        <div className="event-admin-danger-copy">
          <div>
            <strong>Delete event</strong>
            <p>
              {canDelete ? <>Type the slug <code>{event.slug}</code> to delete this unused draft.</> :
                <>Permanent deletion is locked because this event is live, archived, or has operational history.
                {` ${attendees.count ?? 0} attendees · ${credentials.count ?? 0} credentials · ${scans.count ?? 0} scans · ${activities.count ?? 0} activities · ${benefits.count ?? 0} benefit claims.`}
                Archive the event to keep its audit records.</>}
            </p>
          </div>
        </div>
        <form action={deleteEvent}>
          <input type="hidden" name="eventId" value={event.id} />
          <input className={inputClass()} name="confirmation" placeholder={event.slug} disabled={!canDelete} />
          <button className="button button-ghost event-admin-delete-button" type="submit" disabled={!canDelete}>
            Delete event
          </button>
        </form>
      </section>
    </>
  );
}
