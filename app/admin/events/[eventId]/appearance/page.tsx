import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCustomizer } from "@/components/event-customizer";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";

type AppearancePageProps = {
  params: Promise<{ eventId: string }>;
};

type Step = { label: string; detail: string; done: boolean; href: string; action: string };

export default async function EventAppearancePage({
  params,
}: AppearancePageProps) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  const { supabase } = await requireOrganizerMembership(`/admin/events/${eventId}/appearance`);
  const [links, websites] = await Promise.all([
    supabase
      .from("figma_plugin_links")
      .select("id,expires_at,revoked_at")
      .eq("event_id", eventId)
      .is("revoked_at", null)
      .limit(20),
    supabase
      .from("event_studio_documents")
      .select("status")
      .eq("event_id", eventId)
      .eq("kind", "website")
      .limit(50),
  ]);

  // eslint-disable-next-line react-hooks/purity -- Request-scoped server timestamp.
  const now = Date.now();
  const base = `/admin/events/${eventId}`;
  const paired = (links.data ?? []).some((link) => Date.parse(link.expires_at) > now);
  const docs = websites.data ?? [];
  const steps: Step[] = [
    {
      label: "Brand basics",
      detail: "Colors plus a logo or cover image.",
      done: Boolean(event.logoUrl || event.heroImageUrl || event.posterUrl),
      href: "#customize-panel-page",
      action: "Set up",
    },
    {
      label: "Pair a Figma file",
      detail: "Connect the file that holds your event website.",
      done: paired || docs.length > 0,
      href: `${base}/design`,
      action: "Pair",
    },
    {
      label: "Sync a website draft",
      detail: "Edit in Figma; the plugin syncs a private draft.",
      done: docs.length > 0,
      href: `${base}/design`,
      action: "Review",
    },
    {
      label: "Publish the website",
      detail: "Preview the draft, then publish it from Design.",
      done: docs.some((doc) => doc.status === "published"),
      href: `${base}/design`,
      action: "Publish",
    },
    {
      label: "Publish the event",
      detail: "Make registration and the public page live.",
      done: event.status === "published",
      href: `${base}/settings`,
      action: "Open settings",
    },
  ];
  const completed = steps.filter((step) => step.done).length;
  const progressKnown = !links.error && !websites.error;

  return (
    <div className="event-admin-editor-page">
      <header className="event-admin-local-heading">
        <span className="section-kicker">Customize</span>
        <h2>Your event essentials.</h2>
        <p>
          Set basic colors, artwork and pass defaults here. Use Figma for the full event website.
        </p>
      </header>

      {progressKnown && (
        <section className="event-admin-section" aria-labelledby="setup-progress-title">
          <h3 id="setup-progress-title">Setup progress</h3>
          <div
            className="setup-progress-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={completed}
            aria-label={`${completed} of ${steps.length} steps complete`}
          >
            <span style={{ width: `${(completed / steps.length) * 100}%` }} />
          </div>
          <p className="text-sm">{completed} of {steps.length} complete</p>
          <ol className="setup-progress">
            {steps.map((step, index) => (
              <li key={step.label} className="setup-step" data-done={step.done}>
                <span className="setup-step-mark" aria-hidden="true">{step.done ? "✓" : index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <span>{step.done ? "Done" : step.detail}</span>
                </div>
                {!step.done && <Link href={step.href}>{step.action}</Link>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="event-admin-section">
        <h3>Designed in Figma. Powered by PassFlow.</h3>
        <p>
          Pair an existing file, insert a starter template, then sync a private draft. Published
          Figma designs take priority over these basic settings.
        </p>
        <div className="event-admin-actions">
          <Link className="button button-dark" href={`${base}/design`}>Open Figma website</Link>
          <Link className="button button-ghost" href={`${base}/design/studio`}>Pass layouts</Link>
        </div>
      </section>

      <EventCustomizer event={event} />
    </div>
  );
}
