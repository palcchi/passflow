import QRCode from "qrcode";
import { PassRenderer } from "@/components/studio-renderer";
import { selectStudioDesign } from "@/lib/studio/select";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, QrCode } from "lucide-react";
import { getPublishedEvent } from "@/lib/events";
import { accountProfile, requireUser } from "@/lib/auth/session";
import { registerForEvent, claimQr, replaceQr } from "@/app/events-actions";
import { SmartSelect } from "@/components/form-fields";
import { eventInk } from "@/lib/event-colors";
import { WristbandInput } from "@/components/wristband-input";
import { qrSvgDataUri } from "@/lib/qr-svg";
import type { CSSProperties } from "react";
import { FigmaPageRenderer } from "@/components/figma-website-renderer";
import { figmaWebsiteData, publishedFigmaWebsite } from "@/lib/figma-published";
import { pageSlot } from "@/lib/figma-website";
import { MadeWithPassFlow } from "@/components/made-with-passflow";

type ClaimPageProps = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const reasonText: Record<string, string> = { invalid_name: "Enter your full name (2 to 100 characters).", not_registered: "Register for this event before claiming a pass.", invalid_code: "The wristband QR code could not be found.", already_claimed: "This QR code is already linked to another attendee.", claim_disabled: "This event uses automatic QR credentials, so no wristband claim is required.", event_full: "Event registration is full.", ticket_full: "This pass category is full.", ticket_not_found: "This pass type is unavailable.", registration_closed: "Registration has not opened yet. Check back soon.", not_approved: "Your registration is still waiting for the organizer's approval.", provider: "Something went wrong. Please try again." };

export default async function ClaimPage({ params, searchParams }: ClaimPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const event = await getPublishedEvent(slug);
  if (!event) notFound();
  const { supabase, user } = await requireUser(`/e/${slug}/claim`);
  const { data: attendee } = await supabase.from("attendees").select("id,name,email,phone,attendee_code,ticket_type_id,approval_status,ticket_types(name,code)").eq("event_id", event.id).eq("user_id", user.id).maybeSingle();
  const [ticketsResult, credentialsResult, profileResult] = await Promise.all([
    supabase.from("ticket_types").select("code,name,price,currency").eq("event_id", event.id).order("created_at"),
    attendee ? supabase.from("qr_credentials").select("code,display_code,status").eq("event_id", event.id).eq("attendee_id", attendee.id).eq("status", "active").maybeSingle() : Promise.resolve({ data: null, error: null }),
    attendee ? supabase.from("attendee_profiles").select("photo_storage_path").eq("attendee_id", attendee.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const {data:studioDesigns} = await supabase.from('event_studio_documents').select('kind,ticket_type_id,document').eq('event_id',event.id).eq('status','published');
  // Figma can design the Ticket page (registration) and the Pass page. With a Form/Pass slot the whole page is Figma's and
  // PassFlow renders into the slot; a Ticket page without a slot still works as a header above the default form.
  const site = await publishedFigmaWebsite(supabase, event.id);
  const ticketPage = site?.pages.find((page) => page.slug === "ticket");
  const passPage = site?.pages.find((page) => page.slug === "pass");
  const ticketHeaderData = ticketPage || passPage ? await figmaWebsiteData(supabase, event, event.theme.ctaLabel || "Register now") : null;
  const studioDocument = selectStudioDesign(studioDesigns??[],['digital','id_card','wristband'],attendee?.ticket_type_id);
  const studioQr = studioDocument && credentialsResult.data ? await QRCode.toDataURL(`PF1:${credentialsResult.data.code}`,{margin:4,width:600,errorCorrectionLevel:'M'}) : null;
  const tickets = ticketsResult.data ?? [];
  const credential = credentialsResult.data;
  const profile = profileResult.data;
  const account = accountProfile(user);
  // The pass shows the account photo; older per-event pass photos remain as a fallback.
  const { data: legacyPhoto } = !account.avatarUrl && profile?.photo_storage_path ? await supabase.storage.from("attendee-photos").createSignedUrl(profile.photo_storage_path, 300) : { data: null };
  const photoSrc = account.avatarUrl ?? legacyPhoto?.signedUrl ?? "";
  const qrData = credential ? qrSvgDataUri(`PF1:${credential.code}`, 260, 260, "#151515", "#ffffff", "square") : null;
  const error = typeof query.error === "string" ? reasonText[query.error] ?? "The request could not be processed." : null;
  const ticketName = (attendee?.ticket_types as { name?: string } | null)?.name ?? "Event Pass";
  const values: Record<string, string> = { name: attendee?.name ?? "", category: ticketName, code: credential?.display_code ?? attendee?.attendee_code ?? "", event_name: event.name, event_date: event.dateLabel, venue: event.venue };
  const themeStyle = { "--event-primary": event.theme.primary, "--event-bg": event.theme.background, "--event-fg": event.theme.foreground } as CSSProperties;

  const passStyle = { ...themeStyle, "--pass-brand": event.theme.primary, "--pass-brand-ink": eventInk(event.theme.primary), "--pass-secondary": event.theme.secondary, "--pass-surface": event.theme.surface } as CSSProperties;
  // A Figma pass replaces the whole default pass card: only the design shows, nothing from the stock page around it.
  const customPass = !!(studioDocument && studioQr && credential);
  const passArt = studioDocument && studioQr ? <div className="claim-pass-art" style={{ maxWidth: studioDocument.width >= studioDocument.height ? 480 : 340 }}><PassRenderer document={studioDocument} data={{...values,photo:photoSrc,logo:event.logoUrl??''}} qr={studioQr}/></div> : null;
  const celebrate = query.registered || query.claimed ? "" : undefined;
  const ticketOptions = tickets.map((ticket) => ({ value: ticket.code, label: ticket.name, description: ticket.price > 0 ? `${ticket.currency} ${Number(ticket.price).toLocaleString("en-US")}` : "Free" }));
  const body = <>
    {error && <p role="alert" className="ui-notice ui-notice-danger ui-mb">{error}</p>}
    {query.requested && <p role="status" className="ui-notice ui-mb">Request sent. You will get an email and a notification here once the organizer reviews it.</p>}
    {query.registered && <p role="status" className="ui-notice ui-notice-success ui-mb">{event.qrConfig.claimMode === "claim" ? "You are registered. Now link your wristband." : "You are registered. Your pass is ready."}</p>}
    {attendee && attendee.approval_status !== "approved" ? (
      <section className="ui-card ui-passstate">
        <span className={attendee.approval_status === "pending" ? "ui-badge ui-badge-warning" : "ui-badge ui-badge-danger"}>{attendee.approval_status === "pending" ? "Waiting for approval" : "Not approved"}</span>
        <h2 className="ui-h2">{attendee.approval_status === "pending" ? "Your request is in." : "Registration not approved"}</h2>
        <p>{attendee.approval_status === "pending" ? `The organizer of ${event.name} reviews every registration. You will get an email and a notification as soon as they decide.` : `The organizer of ${event.name} could not approve your registration this time.`}</p>
      </section>
    ) : !attendee && !event.registrationOpen ? (
      <section className="ui-card ui-passstate">
        <span className="ui-badge ui-badge-warning">Coming soon</span>
        <h2 className="ui-h2">Registration opens soon</h2>
        <p>{event.name} is not taking registrations yet. Check back later.</p>
      </section>
    ) : !attendee ? (
      <form action={registerForEvent} className="ui-card ui-register">
        <input type="hidden" name="event_slug" value={slug} />
        {account.fullName ? (
          <div className="ui-tile ui-whoami">
            <span className="ui-avatar ui-avatar-lg" style={account.avatarUrl ? { backgroundImage: `url("${account.avatarUrl}")` } : undefined}>{!account.avatarUrl && account.fullName.charAt(0).toUpperCase()}</span>
            <span className="ui-listrow-main"><small>Registering as</small><strong>{account.fullName}</strong><small>{account.email}</small></span>
            <Link href="/profile" className="ui-link ui-link-sm">Edit</Link>
          </div>
        ) : (
          <label className="ui-field"><span>Full name</span><input className="ui-input" required minLength={2} maxLength={100} name="name" autoComplete="name" placeholder="Your full name" /><small>Saved to your profile and printed on your pass.</small></label>
        )}
        <label className="ui-field"><span>WhatsApp number <span className="ui-muted">(optional)</span></span><input className="ui-input" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+62 812 3456 7890" /></label>
        <div className="ui-field"><span>Pass</span><SmartSelect name="ticket_code" value={tickets[0]?.code ?? ""} options={ticketOptions} /></div>
        {event.requiresApproval && <p className="ui-notice">The organizer approves each registration. Your pass is issued once you are approved.</p>}
        <button className="ui-btn ui-btn-primary ui-btn-lg ui-btn-block" type="submit" disabled={!tickets.length}>{event.requiresApproval ? "Request to join" : "Register"}</button>
        <p className="ui-small ui-center">By registering you agree to the <Link href="/terms" className="ui-link ui-link-sm">Terms</Link> and <Link href="/privacy" className="ui-link ui-link-sm">Privacy Policy</Link>. The organizer receives your name, email and phone.</p>
      </form>
    ) : credential && customPass ? (
      <section className="claim-pass-only" data-celebrate={celebrate} aria-label={`Event pass for ${attendee.name}`}>{passArt}</section>
    ) : credential ? (
      <section className="ui-pass" data-celebrate={celebrate} aria-label={`Event pass for ${attendee.name}`}>
        <div className="ui-pass-top">
          {event.logoUrl ? <Image src={event.logoUrl} alt="" width={36} height={36} unoptimized className="ui-pass-logo" /> : null}
          <span><strong>{event.name}</strong><small>{event.dateLabel}{event.venue ? `, ${event.venue}` : ""}</small></span>
        </div>
        <div className="ui-pass-body">
          {passArt}
          <div className="ui-pass-who"><small>Attendee</small><strong>{attendee.name}</strong><span>{ticketName}</span></div>
          {!studioDocument && qrData && <div className="ui-pass-qr"><Image src={qrData} alt={`QR pass for ${attendee.name}`} width={220} height={220} unoptimized /></div>}
          <div className="ui-pass-code"><span className="ui-mono">{credential.display_code ?? credential.code}</span><span className="ui-badge ui-badge-success">Active</span></div>
        </div>
        <div className="ui-pass-foot">
          {event.startsAt && event.endsAt && <a className="ui-btn ui-btn-secondary ui-btn-sm" href={`/e/${event.slug}/calendar`} download>Add to calendar</a>}
          <span className="ui-small">Show this QR at the door. It also works on a printed card or wristband.</span>
        </div>
        {event.qrConfig.claimMode === "claim" && <form action={replaceQr} className="ui-pass-replace"><input type="hidden" name="event_slug" value={slug} /><WristbandInput /><button className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-block" type="submit">Replace wristband</button></form>}
      </section>
    ) : event.qrConfig.claimMode === "claim" ? (
      <form action={claimQr} className="ui-card ui-passstate">
        <QrCode size={30} />
        <h2 className="ui-h2">Link your wristband</h2>
        <p>Scan the QR on the wristband or card you received, then confirm.</p>
        <input type="hidden" name="event_slug" value={slug} />
        <WristbandInput />
        <button className="ui-btn ui-btn-primary ui-btn-block" type="submit">Link wristband</button>
      </form>
    ) : (
      <section className="ui-card ui-passstate"><h2 className="ui-h2">Pass not ready</h2><p>Your pass is created when you register. If you registered before this event switched to automatic passes, ask the organizer to save Automatic mode again in Access.</p></section>
    )}
  </>;
  const slotPage = credential ? (pageSlot(passPage, "passSlot") ? passPage : undefined) : (pageSlot(ticketPage, "formSlot") ? ticketPage : undefined);
  if (slotPage && ticketHeaderData) return <><FigmaPageRenderer page={slotPage} data={ticketHeaderData} slot={<div className="pass-digital-shell" style={passStyle}>{body}</div>}/><MadeWithPassFlow/></>;
  const heading = credential ? "Your pass" : attendee?.approval_status === "pending" ? "Request received" : attendee ? event.qrConfig.claimMode === "claim" ? "Link your wristband" : "Your pass" : event.requiresApproval ? "Request to join" : "Register";
  return <>{ticketPage && ticketHeaderData && <FigmaPageRenderer page={ticketPage} data={ticketHeaderData} />}
    <main className="ui-app ui-passpage" style={passStyle}>
      <div className="ui-passpage-inner">
        {!ticketPage && !customPass && <Link href={`/e/${event.slug}?view=details`} className="ui-back"><ArrowLeft size={14} />{event.name}</Link>}
        {!customPass && <h1 className="ui-h1 ui-passpage-title">{heading}</h1>}
        {body}
      </div>
    </main>
    <MadeWithPassFlow /></>;
}
