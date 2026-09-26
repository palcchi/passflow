import { requireOrganizer } from "@/lib/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Figma, Sparkles } from "lucide-react";
import { EventThemeEditor } from "@/components/event-theme-editor";
import { QrDeliveryEditor } from "@/components/qr-delivery-editor";
import { BlurFade } from "@/components/magicui/blur-fade";
import { getManagedEvent } from "@/lib/events";

type AppearancePageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventAppearancePage({
  params,
}: AppearancePageProps) {
  const { eventId } = await params;
  await requireOrganizer(`/admin/events/${eventId}/appearance`);
  const event = await getManagedEvent(eventId);

  if (!event) notFound();

  return (
    <main className="editor-page">
      <BlurFade>
        <header className="editor-header">
          <div>
            <Link href={`/admin/events/${eventId}`} className="back-link">
              <ArrowLeft size={16} />
              Kembali ke event
            </Link>
            <span className="dashboard-welcome-kicker design-page-kicker">
              <Sparkles size={13} /> Event customization
            </span>
            <h1>Customize {event.name}</h1>
            <p>
              Atur visual publik, asset event, dan format QR dari satu workspace dengan
              preview langsung.
            </p>
          </div>
          <div className="editor-header-actions">
            <Link href={`/admin/events/${eventId}/design`} className="button button-ghost">
              <Figma size={16} /> PassFlow Design
            </Link>
            <Link href={`/e/${event.slug}`} className="button button-dark">
              <ExternalLink size={16} /> Public page
            </Link>
          </div>
        </header>
      </BlurFade>
      <BlurFade delay={0.04}>
        <EventThemeEditor event={event} />
      </BlurFade>
      <BlurFade delay={0.08}>
        <QrDeliveryEditor event={event} />
      </BlurFade>
    </main>
  );
}
