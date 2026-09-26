import { notFound } from "next/navigation";
import { EventThemeEditor } from "@/components/event-theme-editor";
import { QrDeliveryEditor } from "@/components/qr-delivery-editor";
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
        <h2>Visual & pass delivery</h2>
        <p>
          Atur warna event, asset publik, bentuk pass, dan posisi QR tanpa
          memuat ulang shell event.
        </p>
      </header>

      <EventThemeEditor event={event} />
      <QrDeliveryEditor event={event} />
    </div>
  );
}
