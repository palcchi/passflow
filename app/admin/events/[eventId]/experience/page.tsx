import { notFound } from "next/navigation";
import { Activity, Gift } from "lucide-react";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { MagicCard } from "@/components/magicui/magic-card";
import { createActivity, createBenefit } from "@/app/admin/actions";

type Props = { params: Promise<{ eventId: string }> };

function inputClass() {
  return "event-admin-input";
}

export default async function EventExperiencePage({ params }: Props) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase } = await requireOrganizerMembership(`/admin/events/${eventId}/experience`);
  const [activitiesResult, benefitsResult, activityCountResult, benefitCountResult] = await Promise.all([
    supabase
      .from("activities")
      .select("id,name,code,description")
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
      <section className="event-admin-metrics event-experience-metrics" aria-label="Experience metrics">
        <MagicCard className="event-admin-metric liquid-panel">
          <span className="event-admin-metric-icon"><Activity size={17} /></span>
          <div>
            <span>Activity logs</span>
            <strong>{activityCountResult.count ?? 0}</strong>
            <small>{activities.length} checkpoints</small>
          </div>
        </MagicCard>
        <MagicCard className="event-admin-metric liquid-panel">
          <span className="event-admin-metric-icon"><Gift size={17} /></span>
          <div>
            <span>Benefit claims</span>
            <strong>{benefitCountResult.count ?? 0}</strong>
            <small>{benefits.length} benefits</small>
          </div>
        </MagicCard>
      </section>

      <section className="event-admin-dual-grid">
        <MagicCard className="event-admin-section liquid-panel">
          <div className="event-admin-section-head">
            <div>
              <span className="section-kicker">Activities</span>
              <h2>Checkpoints</h2>
              <p>Catat keikutsertaan attendee pada aktivitas di dalam event.</p>
            </div>
            <span className="event-admin-section-icon"><Activity size={18} /></span>
          </div>

          <div className="event-admin-stack">
            {activities.map((activity) => (
              <div className="event-admin-row-card" key={activity.id}>
                <strong>{activity.name}</strong>
                <span>{activity.code}</span>
                {activity.description && <small>{activity.description}</small>}
              </div>
            ))}
            {!activities.length && (
              <div className="event-admin-table-empty">Belum ada activity checkpoint.</div>
            )}
          </div>

          <form action={createActivity} className="event-admin-stack event-admin-subform">
            <input type="hidden" name="eventId" value={event.id} />
            <input className={inputClass()} name="name" placeholder="Workshop A" required />
            <input className={inputClass()} name="code" placeholder="WORKSHOP_A" />
            <input className={inputClass()} name="description" placeholder="Description" />
            <button className="button button-ghost" type="submit">Add activity</button>
          </form>
        </MagicCard>

        <MagicCard className="event-admin-section liquid-panel">
          <div className="event-admin-section-head">
            <div>
              <span className="section-kicker">Benefits</span>
              <h2>One-time claims</h2>
              <p>Kelola benefit yang hanya boleh diklaim satu kali oleh attendee.</p>
            </div>
            <span className="event-admin-section-icon"><Gift size={18} /></span>
          </div>

          <div className="event-admin-stack">
            {benefits.map((benefit) => (
              <div className="event-admin-row-card" key={benefit.id}>
                <strong>{benefit.name}</strong>
                <span>{benefit.code}</span>
                {benefit.description && <small>{benefit.description}</small>}
              </div>
            ))}
            {!benefits.length && (
              <div className="event-admin-table-empty">Belum ada benefit.</div>
            )}
          </div>

          <form action={createBenefit} className="event-admin-stack event-admin-subform">
            <input type="hidden" name="eventId" value={event.id} />
            <input className={inputClass()} name="name" placeholder="Merch Pack" required />
            <input className={inputClass()} name="code" placeholder="MERCH_PACK" />
            <input className={inputClass()} name="description" placeholder="Description" />
            <button className="button button-ghost" type="submit">Add benefit</button>
          </form>
        </MagicCard>
      </section>
    </>
  );
}
