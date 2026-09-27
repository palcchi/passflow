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
        <span className="section-kicker">Customize</span>
        <h2>Make it yours.</h2>
        <p>
          Define the event identity, preview the result, and publish a consistent visual experience.
        </p>
      </header>

      <EventCustomizer event={event} />
    </div>
  );
}
