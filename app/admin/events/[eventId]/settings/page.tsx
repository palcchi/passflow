import { notFound } from "next/navigation";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { DateTimeField, FormattedNumberInput } from "@/components/form-fields";
import { deleteEvent, setEventStatus, updateEvent } from "@/app/admin/actions";

type Props = { params: Promise<{ eventId: string }> };

function inputClass() {
  return "event-admin-input";
}

export default async function EventSettingsPage({ params }: Props) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  await requireOrganizerMembership(`/admin/events/${eventId}/settings`);

  return (
    <>
      <section className="event-admin-section liquid-panel">
        <div className="event-admin-section-head">
          <div>
            <span className="section-kicker">Settings</span>
            <h2>Basics & lifecycle</h2>
            <p>Informasi inti event, jadwal, kapasitas, dan status publikasi.</p>
          </div>
        </div>

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
            <button className="button button-dark" type="submit">Save changes</button>
          </div>
        </form>

        <div className="event-admin-status-row">
          <div>
            <strong>Event status</strong>
            <span>Atur lifecycle event dari Draft, Published, atau Archived.</span>
          </div>
          <div className="event-admin-status-actions">
            {(["draft", "published", "archived"] as const).map((status) => (
              <form action={setEventStatus} key={status}>
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="status" value={status} />
                <button
                  className={`event-admin-status-button ${event.status === status ? "is-active" : ""}`}
                  type="submit"
                >
                  {status}
                </button>
              </form>
            ))}
          </div>
        </div>
      </section>

      <section className="event-admin-danger-zone">
        <div className="event-admin-danger-copy">
          <div>
            <strong>Delete event</strong>
            <p>
              Ketik slug <code>{event.slug}</code> untuk menghapus event beserta attendee,
              QR, station, dan log terkait.
            </p>
          </div>
        </div>
        <form action={deleteEvent}>
          <input type="hidden" name="eventId" value={event.id} />
          <input className={inputClass()} name="confirmation" placeholder={event.slug} />
          <button className="button button-ghost event-admin-delete-button" type="submit">
            Delete event
          </button>
        </form>
      </section>
    </>
  );
}
