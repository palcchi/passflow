import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { getPublishedEvent } from "@/lib/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { readTemplate } from "@/lib/design-template";
import { CollectionArtwork, Sticker } from "@/components/flow-brand-art";
import { KineticText } from "@/components/magicui/kinetic-text";
import { FlowMark } from "@/components/flow-art";
import { eventInk } from "@/lib/event-colors";

type EventPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
};

export default async function PublicEventPage({ params, searchParams }: EventPageProps) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);

  if (!event) notFound();
  const context = await getAuthContext();
  if (context && (await searchParams).view !== "details") {
    const { data: registration } = await context.supabase.from("attendees").select("id").eq("user_id", context.user.id).eq("event_id", event.id).limit(1).maybeSingle();
    if (registration) redirect(`/e/${event.slug}/claim`);
  }

  const themeStyle = {
    "--foreground": event.theme.foreground,
    "--muted-foreground": `color-mix(in srgb, ${event.theme.foreground} 72%, ${event.theme.background})`,
    "--event-primary": event.theme.primary,
    "--event-primary-ink": eventInk(event.theme.primary),
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
        {cta ? <Link href={`/e/${event.slug}/claim`} aria-label="Register or open event pass" title="Register / open pass" className="event-figma-cta-hitbox" style={{ left: `${cta.x / frame.width * 100}%`, top: `${cta.y / frame.height * 100}%`, width: `${cta.width / frame.width * 100}%`, height: `${cta.height / frame.height * 100}%` }} /> : null}
      </div>
      {!cta && <Link href={`/e/${event.slug}/claim`} className="event-primary-button event-figma-default-cta">Register / open pass <ArrowRight size={17}/></Link>}
    </main>;
  }

  return (
    <main className="event-public-shell flow-public-event" style={themeStyle}>
      <nav className="event-public-nav">
        <Link href="/" className="event-wordmark">
          <FlowMark/> PassFlow
        </Link>
        <Link href={`/e/${event.slug}/claim`} className="event-nav-link">
          My pass
        </Link>
      </nav>

      <section className={`event-public-hero event-header-${event.theme.headerStyle ?? "editorial"}`}>
        <div className="event-public-copy">
          {event.logoUrl && <Image src={event.logoUrl} alt={event.name} width={120} height={80} unoptimized className="mb-5 object-contain" />}
          <span className="event-kicker">{event.eyebrow}</span>
          <KineticText text={event.name}/>
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
              Register / open pass
              <ArrowRight size={17} />
            </Link>
            <span className="event-helper">
              <ShieldCheck size={16} />
              QR access enabled
            </span>
          </div>
        </div>

        {event.heroImageUrl || event.posterUrl ? <Image src={(event.heroImageUrl || event.posterUrl)!} alt={event.name} width={1600} height={900} unoptimized className="event-public-cover" /> : <div className="event-public-art"><span className="section-kicker">SAVE THE DATE. MAKE A MEMORY.</span><CollectionArtwork compact/></div>}
      </section>

      <section className="event-info-grid">
        <article>
          <Sticker kind="arrow"/>
          <h2>{event.qrConfig.mode === "digital" ? "Get your digital pass" : "Claim your event pass"}</h2>
          <p>{event.qrConfig.mode === "digital" ? "After registration, your digital QR pass is available in your account automatically." : "Use the QR code on the ID card or wristband provided by the organizer."}</p>
        </article>
        <article>
          <Sticker kind="check"/>
          <h2>Use either format</h2>
          <p>{event.qrConfig.mode === "digital" ? "Your digital QR can be displayed directly on your phone and used across authorized access points." : "The same QR credential works in physical format and in the Digital Event Pass on your phone."}</p>
        </article>
        <article>
          <Sticker kind="smile"/>
          <h2>Move through the event</h2>
          <p>Scanners automatically validate identity, access permissions, activities, and available benefits.</p>
        </article>
      </section>
    </main>
  );
}
