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

      <p className="event-admin-note">Need a fully custom website? <Link href={`/admin/events/${eventId}/design`}>Design it in Figma</Link> — a published Figma design takes priority over Quick Setup.</p>
      <EventCustomizer event={event} />
    </div>
  );
}
