import { requireOrganizerMembership } from "@/lib/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EventThemeEditor } from "@/components/event-theme-editor";
import { getEventById } from "@/lib/events";

type AppearancePageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventAppearancePage({ params }: AppearancePageProps) {
  const { eventId } = await params;
  await requireOrganizerMembership(`/admin/events/${eventId}/appearance`);
  const event = await getEventById(eventId);

  if (!event) notFound();

  return (
    <main className="editor-page">
      <header className="editor-header">
        <div>
          <Link href={`/admin/events/${event.id}`} className="back-link"><ArrowLeft size={16} /> Back to event</Link>
          <span className="section-kicker">Event appearance</span>
          <h1>Customize {event.name}</h1>
          <p>Theme dan asset disimpan ke Supabase dan langsung dipakai halaman publik event.</p>
        </div>
        <Link href={`/e/${event.slug}`} className="button button-dark">View public page</Link>
      </header>
      <EventThemeEditor event={event} />
    </main>
  );
}
