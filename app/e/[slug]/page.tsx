import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { getEventBySlug } from "@/lib/events";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicEventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  if (!event) notFound();

  const themeStyle = {
    "--event-primary": event.theme.primary,
    "--event-secondary": event.theme.secondary,
    "--event-bg": event.theme.background,
    "--event-fg": event.theme.foreground,
    "--event-surface": event.theme.surface,
  } as CSSProperties;

  return (
    <main className="event-public-shell" style={themeStyle}>
      <nav className="event-public-nav">
        <Link href="/" className="event-wordmark">
          PASSFLOW / {event.name.toUpperCase()}
        </Link>
        <Link href={`/e/${event.slug}/claim`} className="event-nav-link">
          My pass
        </Link>
      </nav>

      <section className="event-public-hero">
        <div className="event-public-copy">
          <span className="event-kicker">{event.eyebrow}</span>
          <h1>{event.name}</h1>
          <p>{event.description}</p>
          <div className="event-meta-row">
            <span>
              <CalendarDays size={17} /> {event.dateLabel}
            </span>
            <span>
              <MapPin size={17} /> {event.venue}
            </span>
          </div>
          <div className="event-cta-row">
            <Link href={`/e/${event.slug}/claim`} className="event-primary-button">
              Open event pass
              <ArrowRight size={17} />
            </Link>
            <span className="event-helper">
              <ShieldCheck size={16} />
              QR access enabled
            </span>
          </div>
        </div>

        <div className="event-poster">
          <div className="poster-topline">
            <span>{event.eyebrow}</span>
            <span>2026</span>
          </div>
          <strong>{event.name}</strong>
          <div className="poster-qr">
            <QrCode size={72} strokeWidth={1.4} />
          </div>
          <small>ONE PASS · MULTIPLE ACCESS POINTS</small>
        </div>
      </section>

      <section className="event-info-grid">
        <article>
          <span>01</span>
          <h2>Claim your wristband</h2>
          <p>Ambil wristband yang tersedia lalu scan QR untuk menghubungkannya ke akunmu.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Use either format</h2>
          <p>QR yang sama dapat dipakai langsung dari gelang atau Digital Event Pass di HP.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Move through the event</h2>
          <p>Scanner otomatis membaca identitas, akses, aktivitas, dan benefit yang tersedia.</p>
        </article>
      </section>
    </main>
  );
}
