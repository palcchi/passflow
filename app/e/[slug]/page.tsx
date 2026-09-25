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
  const event = await getEventBySlug(slug);

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
            <span><CalendarDays size={17} /> {event.dateLabel}</span>
            <span><MapPin size={17} /> {event.venue}</span>
          </div>
          <div className="event-cta-row">
            <Link href={`/e/${event.slug}/claim`} className="event-primary-button">
              Register / open pass
              <ArrowRight size={17} />
            </Link>
            <span className="event-helper"><ShieldCheck size={16} /> QR access enabled</span>
          </div>
        </div>

        <div
          className="event-poster"
          style={event.heroImageUrl ? {
            backgroundImage: `linear-gradient(rgba(0,0,0,.18), rgba(0,0,0,.18)), url("${event.heroImageUrl}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          } : undefined}
        >
          <div className="poster-topline">
            <span>{event.eyebrow}</span>
            <span>{event.startsAt ? new Date(event.startsAt).getFullYear() : "PASSFLOW"}</span>
          </div>
          <strong>{event.name}</strong>
          <div className="poster-qr"><QrCode size={72} strokeWidth={1.4} /></div>
          <small>ONE PASS · MULTIPLE ACCESS POINTS</small>
        </div>
      </section>

      <section className="event-info-grid">
        <article>
          <span>01</span>
          <h2>Register once</h2>
          <p>Pilih kategori pass, lalu attendee record terhubung ke akun PassFlow kamu.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Claim your wristband</h2>
          <p>Ambil wristband yang tersedia lalu scan QR untuk menghubungkannya ke akunmu.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Move through the event</h2>
          <p>Scanner memvalidasi check-in, zone access, activity, dan benefit langsung dari database.</p>
        </article>
      </section>
    </main>
  );
}
