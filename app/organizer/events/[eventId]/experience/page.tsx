import { FormDialog } from "@/components/form-dialog";
import { ResourceManager } from "@/components/resource-manager";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { createActivity, createBenefit } from "@/app/organizer/events/actions";

type Props = { params: Promise<{ eventId: string }> };

export default async function EventExperiencePage({ params }: Props) {
  const { eventId } = await params;
  const { supabase } = await requireOrganizerMembership(
    `/organizer/events/${eventId}/experience`,
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
    <div className="ui-grid ui-grid-2 ui-align-start">
      <section className="ui-card ui-panel" aria-labelledby="activities-title">
        <div className="ui-panelhead">
          <div>
            <h2 id="activities-title" className="ui-h3">Activities</h2>
            <small>{activities.length} {activities.length === 1 ? "checkpoint" : "checkpoints"}, {(activityCountResult.count ?? 0).toLocaleString("en-US")} scans</small>
          </div>
          <FormDialog trigger="Add" triggerClassName="ui-btn ui-btn-secondary ui-btn-sm" title="Add activity" description="A session or booth where crew scan attendees to record participation." action={createActivity} submitLabel="Add activity">
            <input type="hidden" name="eventId" value={eventId} />
            <label>Name<input name="name" placeholder="Workshop A" required maxLength={100} /></label>
            <label>Code <small>Optional, made from the name</small><input name="code" placeholder="WORKSHOP_A" maxLength={40} /></label>
            <label>Description <small>Optional</small><textarea name="description" maxLength={500} /></label>
          </FormDialog>
        </div>
        <p className="ui-small ui-mb">Sessions or booths where crew scan passes to record who joined.</p>
        <ResourceManager eventId={eventId} kind="activity" records={activities} />
      </section>
      <section className="ui-card ui-panel" aria-labelledby="benefits-title">
        <div className="ui-panelhead">
          <div>
            <h2 id="benefits-title" className="ui-h3">Benefits</h2>
            <small>{benefits.length} {benefits.length === 1 ? "benefit" : "benefits"}, {(benefitCountResult.count ?? 0).toLocaleString("en-US")} claimed</small>
          </div>
          <FormDialog trigger="Add" triggerClassName="ui-btn ui-btn-secondary ui-btn-sm" title="Add benefit" description="Something each attendee can claim once, like merch or a drink." action={createBenefit} submitLabel="Add benefit">
            <input type="hidden" name="eventId" value={eventId} />
            <label>Name<input name="name" placeholder="Merchandise Pack" required maxLength={100} /></label>
            <label>Code <small>Optional, made from the name</small><input name="code" placeholder="MERCH_PACK" maxLength={40} /></label>
            <label>Description <small>Optional</small><textarea name="description" maxLength={500} /></label>
          </FormDialog>
        </div>
        <p className="ui-small ui-mb">Things each guest can claim once, like a welcome kit or a drink.</p>
        <ResourceManager eventId={eventId} kind="benefit" records={benefits} />
      </section>
    </div>
  );
}
