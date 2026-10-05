import { WebsiteRenderer } from "@/components/studio-renderer";
import { readStudioDocument } from "@/lib/studio/model";
import {readFigmaWebsite} from '@/lib/figma-website';
import {FigmaWebsiteRenderer} from '@/components/figma-website-renderer';
import {figmaWebsiteData} from '@/lib/figma-published';
import {getAppOrigin} from '@/lib/supabase/config';
import type { CSSProperties } from "react";
import Link from "next/link";
import { EventArtwork } from "@/components/event-artwork";
import Image from "next/image";
import { notFound } from "next/navigation";
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
import { Sticker } from "@/components/flow-brand-art";
import { KineticText } from "@/components/magicui/kinetic-text";
import { FlowMark } from "@/components/flow-art";
import { eventInk } from "@/lib/event-colors";
import type {Metadata} from 'next';

type EventPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
};

export async function generateMetadata({params}:EventPageProps):Promise<Metadata>{
  const {slug}=await params,event=await getPublishedEvent(slug);
  if(!event)return {title:'Event unavailable',robots:{index:false,follow:false}};
  const origin=getAppOrigin()??'https://passflow.my.id',url=origin+'/e/'+encodeURIComponent(event.slug),image=event.heroImageUrl??event.posterUrl??url+'/opengraph-image';
  return {title:event.name,description:event.description.slice(0,160),alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title:event.name,description:event.description,url,images:[{url:image}]},twitter:{card:'summary_large_image',title:event.name,description:event.description,images:[image]},icons:event.logoUrl?{icon:event.logoUrl}:undefined};
}

export default async function PublicEventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);

  if (!event) notFound();
  const context = await getAuthContext();
  const { data: registration } = context
    ? await context.supabase
        .from("attendees")
        .select("id")
        .eq("user_id", context.user.id)
        .eq("event_id", event.id)
        .limit(1)
        .maybeSingle()
    : { data: null };
  const ctaLabel = !context
    ? "Sign in to register"
    : registration
      ? "View my pass"
      : event.theme.ctaLabel || "Register now";

  const themeStyle = {
    "--foreground": event.theme.foreground,
    "--muted-foreground": `color-mix(in srgb, ${event.theme.foreground} 72%, ${event.theme.background})`,
    "--event-primary": event.theme.primary,
    "--event-primary-ink": eventInk(event.theme.primary),
    "--event-secondary": event.theme.secondary,
    "--event-bg": event.theme.background,
    "--event-fg": event.theme.foreground,
    "--event-surface": event.theme.surface,
    "--event-font": event.theme.font === "serif" ? '"New York", "Iowan Old Style", Georgia, serif' : event.theme.font === "mono" ? 'ui-monospace, "SF Mono", Menlo, monospace' : "inherit",
    "--event-radius": event.theme.corners === "sharp" ? "4px" : event.theme.corners === "soft" ? "14px" : "999px",
  } as CSSProperties;

  const supabase = getSupabaseConfig() ? await createServerSupabaseClient() : null;
  const { data: website } = supabase ? await supabase.from("event_studio_documents").select("document").eq("event_id",event.id).eq("kind","website").eq("status","published").is("ticket_type_id",null).maybeSingle() : {data:null};
  const websiteDocument = readStudioDocument(website?.document);
  const figmaWebsite=readFigmaWebsite(website?.document);
  if(figmaWebsite&&supabase)return <main><FigmaWebsiteRenderer document={figmaWebsite} data={await figmaWebsiteData(supabase,event,ctaLabel)}/></main>;
  if(websiteDocument) return <main><WebsiteRenderer document={websiteDocument} data={{event_name:event.name,event_date:event.dateLabel,venue:event.venue,description:event.description,banner:event.heroImageUrl??'',logo:event.logoUrl??''}} claimUrl={`/e/${event.slug}/claim`}/></main>;

  // The default page is the only page until a Figma design is published, so it lists the passes on sale.
  const { data: tickets } = supabase ? await supabase.from("ticket_types").select("id,name,price,currency").eq("event_id", event.id).order("price") : { data: [] };
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
          {event.eyebrow && <span className="event-kicker">{event.eyebrow}</span>}
          <KineticText text={event.name}/>
          {event.description && <p>{event.description}</p>}
          <div className="event-meta-row">
            <span>
              <CalendarDays size={17} /> {event.dateLabel}
              {event.startsAt && event.endsAt && <a className="event-calendar-link" href={`/e/${event.slug}/calendar`} download>Add to calendar</a>}
            </span>
            {event.venue && <span>
              <MapPin size={17} /> {event.venue}
            </span>}
          </div>
          <div className="event-cta-row">
            <Link href={`/e/${event.slug}/claim`} className="event-primary-button">
              {ctaLabel}
              <ArrowRight size={17} />
            </Link>
            <span className="event-helper">
              <ShieldCheck size={16} />
              QR access enabled
            </span>
          </div>
        </div>

        {event.heroImageUrl || event.posterUrl ? <Image src={(event.heroImageUrl || event.posterUrl)!} alt={event.name} width={1600} height={900} unoptimized className="event-public-cover" /> : <div className="event-public-cover event-public-artwork"><EventArtwork event={event}/></div>}
      </section>

      {!!tickets?.length && <section className="event-ticket-list" aria-labelledby="event-tickets-title">
        <h2 id="event-tickets-title">Passes</h2>
        <ul>{tickets.map((t) => <li key={t.id}><Link href={`/e/${event.slug}/claim`}><strong>{t.name}</strong><span>{t.price > 0 ? `${t.currency} ${Number(t.price).toLocaleString("en-US")}` : "Free"}</span><ArrowRight size={16} /></Link></li>)}</ul>
      </section>}

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
