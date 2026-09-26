import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { getPublishedEvent } from "@/lib/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { readTemplate } from "@/lib/design-template";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicEventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);

  if (!event) notFound();

  const themeStyle = {
    "--event-primary": event.theme.primary,
    "--event-secondary": event.theme.secondary,
    "--event-bg": event.theme.background,
    "--event-fg": event.theme.foreground,
    "--event-surface": event.theme.surface,
  } as CSSProperties;

  const supabase = getSupabaseConfig() ? await createServerSupabaseClient() : null;
  const { data: eventDesign } = supabase ? await supabase.from("event_designs").select("name,preview_url,template")
    .eq("event_id", event.id).eq("kind", "event_page").is("ticket_type_id", null).order("updated_at", { ascending: false }).limit(1).maybeSingle() : { data: null };
  if (eventDesign?.preview_url) {
    const template = readTemplate(eventDesign.template);
    const frame = template.frame;
    const cta = template.elements.find((element) => ["cta", "register", "claim"].includes(element.field));
    const values: Record<string, string> = { event_name: event.name, event_date: event.dateLabel, venue: event.venue };
    return <main className="event-figma-shell" style={themeStyle}>
      <div className="event-figma-frame" style={{ aspectRatio: `${frame.width} / ${frame.height}` }}>
        <Image src={eventDesign.preview_url} alt={`Desain event ${event.name}`} fill unoptimized sizes="100vw" className="event-figma-background" />
        {template.elements.filter((element) => element.field in values).map((element) => <span key={element.nodeId} style={{ position: "absolute", left: `${element.x / frame.width * 100}%`, top: `${element.y / frame.height * 100}%`, width: `${element.width / frame.width * 100}%`, height: `${element.height / frame.height * 100}%`, display: "flex", alignItems: "center", justifyContent: element.textAlign === "CENTER" ? "center" : element.textAlign === "RIGHT" ? "flex-end" : "flex-start", overflow: "hidden", padding: 2, backgroundColor: element.fill ?? "rgba(255,255,255,.94)", color: element.fontColor ?? event.theme.foreground, fontFamily: element.fontFamily ?? "inherit", fontSize: `${Math.max(10, element.fontSize ?? 18) / frame.width * 100}cqw`, fontWeight: element.fontWeight ?? 500, borderRadius: element.cornerRadius ?? 0 }}>{values[element.field]}</span>)}
        {cta ? <Link href={`/e/${event.slug}/claim`} aria-label="Daftar atau buka pass event" title="Daftar / buka pass" className="event-figma-cta-hitbox" style={{ left: `${cta.x / frame.width * 100}%`, top: `${cta.y / frame.height * 100}%`, width: `${cta.width / frame.width * 100}%`, height: `${cta.height / frame.height * 100}%` }} /> : null}
      </div>
      {!cta && <Link href={`/e/${event.slug}/claim`} className="event-primary-button event-figma-default-cta">Daftar / buka pass <ArrowRight size={17}/></Link>}
    </main>;
  }

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

      <section className={`event-public-hero event-header-${event.theme.headerStyle ?? "editorial"}`}>
        <div className="event-public-copy">
          {event.logoUrl && <Image src={event.logoUrl} alt={event.name} width={120} height={80} unoptimized className="mb-5 object-contain" />}
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

        {event.heroImageUrl || event.posterUrl ? <Image src={(event.heroImageUrl || event.posterUrl)!} alt={event.name} width={720} height={900} unoptimized className="w-full rounded-xl object-cover" /> : <div className="event-poster">
          <div className="poster-topline">
            <span>{event.eyebrow}</span>
            <span>2026</span>
          </div>
          <strong>{event.name}</strong>
          <div className="poster-qr">
            <QrCode size={72} strokeWidth={1.4} />
          </div>
          <small>ONE PASS · MULTIPLE ACCESS POINTS</small>
        </div>}
      </section>

      <section className="event-info-grid">
        <article>
          <span>01</span>
          <h2>{event.qrConfig.mode === "digital" ? "Get your digital pass" : "Claim your event pass"}</h2>
          <p>{event.qrConfig.mode === "digital" ? "Setelah mendaftar, QR digital otomatis tersedia di akunmu tanpa wristband fisik." : "Gunakan QR pada ID card atau wristband yang ditentukan organizer."}</p>
        </article>
        <article>
          <span>02</span>
          <h2>Use either format</h2>
          <p>{event.qrConfig.mode === "digital" ? "QR digital dapat ditampilkan langsung dari HP dan dipakai di seluruh titik akses." : "QR yang sama dapat dipakai dari format fisik dan Digital Event Pass di HP."}</p>
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
