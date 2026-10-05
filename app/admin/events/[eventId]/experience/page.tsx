import { FormDialog } from "@/components/form-dialog";
import { ResourceManager } from "@/components/resource-manager";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { createActivity, createBenefit } from "@/app/admin/actions";

type Props = { params: Promise<{ eventId: string }> };

export default async function EventExperiencePage({ params }: Props) {
  const { eventId } = await params;
  const { supabase } = await requireOrganizerMembership(
    `/admin/events/${eventId}/experience`,
  );

  const [
    activitiesResult,
    benefitsResult,
    activityCountResult,
    benefitCountResult,
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("id,name,code,description,is_active")
      .eq("event_id", eventId)
      .order("created_at"),
    supabase
      .from("benefits")
      .select("id,name,code,description,is_active")
      .eq("event_id", eventId)
      .order("created_at"),
    supabase
      .from("activity_logs")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("benefit_claims")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
  ]);

  const activities = activitiesResult.data ?? [];
  const benefits = benefitsResult.data ?? [];

  return (
    <>
      <section
        className="event-admin-metrics event-experience-metrics"
        aria-label="Experience metrics"
      >
        <div className="event-admin-metric">
          <span>Activity logs</span>
          <strong>{activityCountResult.count ?? 0}</strong>
          <small>{activities.length} checkpoints</small>
        </div>
        <div className="event-admin-metric">
          <span>Benefit claims</span>
          <strong>{benefitCountResult.count ?? 0}</strong>
          <small>{benefits.length} benefits</small>
        </div>
      </section>

      <section className="event-admin-dual-grid">
        <div className="event-admin-section">
          <div className="event-admin-section-head">
            <div>
              <span className="section-kicker">Activities</span>
              <h2>Checkpoints</h2>
              <p>Track attendee participation across activities within the event.</p>
            </div>
            <FormDialog trigger="Add activity" title="Add activity" description="A session or booth where crew scan attendees to record participation." action={createActivity} submitLabel="Add activity">
              <input type="hidden" name="eventId" value={eventId} />
              <label>Name<input name="name" placeholder="Workshop A" required maxLength={100} /></label>
              <label>Code <small>Optional, made from the name</small><input name="code" placeholder="WORKSHOP_A" maxLength={40} /></label>
              <label>Description <small>Optional</small><textarea name="description" maxLength={500} /></label>
            </FormDialog>
          </div>

          <ResourceManager eventId={eventId} kind="activity" records={activities} />

        </div>

        <div className="event-admin-section">
          <div className="event-admin-section-head">
            <div>
              <span className="section-kicker">Benefits</span>
              <h2>One-time claims</h2>
              <p>Manage benefits that can only be claimed once per attendee.</p>
            </div>
            <FormDialog trigger="Add benefit" title="Add benefit" description="Something each attendee can claim once, like merch or a drink." action={createBenefit} submitLabel="Add benefit">
              <input type="hidden" name="eventId" value={eventId} />
              <label>Name<input name="name" placeholder="Merchandise Pack" required maxLength={100} /></label>
              <label>Code <small>Optional, made from the name</small><input name="code" placeholder="MERCH_PACK" maxLength={40} /></label>
              <label>Description <small>Optional</small><textarea name="description" maxLength={500} /></label>
            </FormDialog>
          </div>

          <ResourceManager eventId={eventId} kind="benefit" records={benefits} />

        </div>
      </section>
    </>
  );
}
