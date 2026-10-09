import { WebsiteRenderer } from "@/components/studio-renderer";
import { readStudioDocument } from "@/lib/studio/model";
import {readFigmaWebsite} from '@/lib/figma-website';
import {MadeWithPassFlow} from "@/components/made-with-passflow";
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
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle()
    : { data: null };
  const ctaLabel = registration
    ? "View my pass"
    : event.registrationOpen === false
      ? "Registration opens soon"
      : !context
        ? "Sign in to register"
        : event.requiresApproval
          ? "Request to join"
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
  if(figmaWebsite&&supabase)return <main><FigmaWebsiteRenderer document={figmaWebsite} data={await figmaWebsiteData(supabase,event,ctaLabel)}/><MadeWithPassFlow/></main>;
  if(websiteDocument) return <main><WebsiteRenderer document={websiteDocument} data={{event_name:event.name,event_date:event.dateLabel,venue:event.venue,description:event.description,banner:event.heroImageUrl??'',logo:event.logoUrl??''}} claimUrl={`/e/${event.slug}/claim`}/></main>;

  // The default page is the only page until a Figma design is published, so it lists the passes on sale.
  const { data: tickets } = supabase ? await supabase.from("ticket_types").select("id,name,price,currency").eq("event_id", event.id).order("price") : { data: [] };
  const helper = event.registrationOpen === false ? "Registration opens soon" : event.requiresApproval ? "The organizer approves each registration" : event.qrConfig.mode === "digital" ? "Your QR pass appears in your account right away" : "Your QR pass works on your phone and on printed credentials";
  return (
    <main className="ui-app ui-ev" style={themeStyle}>
      <nav className="ui-ev-nav" aria-label="Event">
        <Link href="/" className="ui-brand" aria-label="PassFlow"><FlowMark /><span>PassFlow</span></Link>
        <Link href={`/e/${event.slug}/claim`} className="ui-btn ui-btn-ghost ui-btn-sm">My pass</Link>
      </nav>

      <section className="ui-ev-hero">
        <div className="ui-ev-copy ui-rise">
          {event.logoUrl && <Image src={event.logoUrl} alt={event.name} width={120} height={64} unoptimized className="ui-ev-logo" />}
          {event.eyebrow && <span className="ui-ev-tagline">{event.eyebrow}</span>}
          <KineticText text={event.name} className="ui-ev-title" />
          <ul className="ui-ev-meta">
            <li><CalendarDays size={17} /><span>{event.dateLabel}</span>{event.startsAt && event.endsAt && <a href={`/e/${event.slug}/calendar`} download>Add to calendar</a>}</li>
            {event.venue && <li><MapPin size={17} /><span>{event.venue}</span></li>}
          </ul>
          {event.description && <p className="ui-ev-desc">{event.description}</p>}
          <div className="ui-ev-cta">
            <Link href={`/e/${event.slug}/claim`} className="ui-ev-button" aria-disabled={event.registrationOpen === false && !registration ? true : undefined}>{ctaLabel}<ArrowRight size={17} /></Link>
            <span><ShieldCheck size={15} />{helper}</span>
          </div>
        </div>
        <div className="ui-ev-cover">
          {event.heroImageUrl || event.posterUrl ? <Image src={(event.heroImageUrl || event.posterUrl)!} alt={event.name} fill unoptimized sizes="(max-width: 900px) 100vw, 560px" priority /> : <EventArtwork event={event} />}
        </div>
      </section>

      {!!tickets?.length && <section className="ui-ev-section" aria-labelledby="event-tickets-title">
        <h2 id="event-tickets-title">Passes</h2>
        <ul className="ui-ev-passes">{tickets.map((t) => <li key={t.id}><Link href={`/e/${event.slug}/claim`}><strong>{t.name}</strong><span>{t.price > 0 ? `${t.currency} ${Number(t.price).toLocaleString("en-US")}` : "Free"}</span><ArrowRight size={16} /></Link></li>)}</ul>
      </section>}

      <section className="ui-ev-section" aria-labelledby="entry-title">
        <h2 id="entry-title">How entry works</h2>
        <ol className="ui-ev-steps">
          <li><strong>{event.requiresApproval ? "Request a pass" : "Register"}</strong><span>{event.requiresApproval ? "The organizer reviews your request and you get an email when you are in." : "Sign in with your PassFlow account and choose a pass."}</span></li>
          <li><strong>{event.qrConfig.mode === "digital" ? "Keep your QR" : "Get your credential"}</strong><span>{event.qrConfig.mode === "digital" ? "Your pass lives in your account and works offline once loaded." : "The same QR works on your phone and on the card or wristband from the organizer."}</span></li>
          <li><strong>Scan in</strong><span>Crew scan your QR at the door, zones and activities.</span></li>
        </ol>
      </section>
      <MadeWithPassFlow />
    </main>
  );
}
