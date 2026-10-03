import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCustomizer } from "@/components/event-customizer";
import { getManagedEvent } from "@/lib/events";

type AppearancePageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventAppearancePage({
  params,
}: AppearancePageProps) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();

  return (
    <div className="event-admin-editor-page">
      <header className="event-admin-local-heading">
        <span className="section-kicker">Quick Setup</span>
        <h2>Your event essentials.</h2>
        <p>
          Set basic colors, artwork and pass defaults. Use Figma for the full event website.
        </p>
      </header>

      <section className="event-admin-section"><h3>Designed in Figma. Powered by PassFlow.</h3><p>Pair an existing file, insert a starter template, then sync a private draft. Published designs take priority over these basic settings.</p><Link className="button button-dark" href={`/admin/events/${eventId}/design`}>Open Design</Link></section>
      <EventCustomizer event={event} />
    </div>
  );
}
