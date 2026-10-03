import QRCode from "qrcode";
import { PassRenderer } from "@/components/studio-renderer";
import { selectStudioDesign } from "@/lib/studio/select";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, QrCode } from "lucide-react";
import { getPublishedEvent } from "@/lib/events";
import { accountProfile, requireUser } from "@/lib/auth/session";
import { registerForEvent, claimQr, replaceQr } from "@/app/events-actions";
import { SmartSelect } from "@/components/form-fields";
import { contrastRatio, eventInk } from "@/lib/event-colors";
import { WristbandInput } from "@/components/wristband-input";
import { readTemplate, type FigmaElement } from "@/lib/design-template";
import { qrSvgDataUri } from "@/lib/qr-svg";
import type { CSSProperties } from "react";

type ClaimPageProps = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const reasonText: Record<string, string> = { invalid_name: "Enter your full name (2–100 characters).", not_registered: "Register for this event before claiming a pass.", invalid_code: "The wristband QR code could not be found.", already_claimed: "This QR code is already linked to another attendee.", claim_disabled: "This event uses automatic QR credentials, so no wristband claim is required.", event_full: "Event registration is full.", ticket_full: "This pass category is full.", ticket_not_found: "This pass type is unavailable.", provider: "Something went wrong. Please try again." };
function boxStyle(element: FigmaElement, frameWidth: number, frameHeight: number): CSSProperties {
  return { position: "absolute", left: `${element.x / frameWidth * 100}%`, top: `${element.y / frameHeight * 100}%`, width: `${element.width / frameWidth * 100}%`, height: `${element.height / frameHeight * 100}%` };
}

export default async function ClaimPage({ params, searchParams }: ClaimPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const event = await getPublishedEvent(slug);
  if (!event) notFound();
  const { supabase, user } = await requireUser(`/e/${slug}/claim`);
  const { data: attendee } = await supabase.from("attendees").select("id,name,email,phone,attendee_code,ticket_type_id,ticket_types(name,code)").eq("event_id", event.id).eq("user_id", user.id).maybeSingle();
  const [ticketsResult, credentialsResult, profileResult, designsResult] = await Promise.all([
    supabase.from("ticket_types").select("code,name,price,currency").eq("event_id", event.id).order("created_at"),
    attendee ? supabase.from("qr_credentials").select("code,display_code,status").eq("event_id", event.id).eq("attendee_id", attendee.id).eq("status", "active").maybeSingle() : Promise.resolve({ data: null, error: null }),
    attendee ? supabase.from("attendee_profiles").select("photo_storage_path").eq("attendee_id", attendee.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("event_designs").select("id,kind,name,preview_url,template,ticket_type_id").eq("event_id", event.id).eq("status", "published").in("kind", ["id_card", "ticket"]).order("updated_at", { ascending: false }),
  ]);
  const {data:studioDesigns} = await supabase.from('event_studio_documents').select('kind,ticket_type_id,document').eq('event_id',event.id).eq('status','published');
  const studioDocument = selectStudioDesign(studioDesigns??[],['digital','id_card','wristband'],attendee?.ticket_type_id);
  const studioQr = studioDocument && credentialsResult.data ? await QRCode.toDataURL(`PF1:${credentialsResult.data.code}`,{margin:4,width:600,errorCorrectionLevel:'M'}) : null;
  const tickets = ticketsResult.data ?? [];
  const credential = credentialsResult.data;
  const profile = profileResult.data;
  const ticketTypeId = attendee?.ticket_type_id;
  const passDesign = (designsResult.data ?? []).find((design) => design.kind === "id_card" && design.ticket_type_id === ticketTypeId && ticketTypeId)
    ?? (designsResult.data ?? []).find((design) => design.kind === "id_card" && !design.ticket_type_id)
    ?? (designsResult.data ?? []).find((design) => design.kind === "ticket" && design.ticket_type_id === ticketTypeId && ticketTypeId)
    ?? (designsResult.data ?? []).find((design) => design.kind === "ticket" && !design.ticket_type_id);
  const template = passDesign ? readTemplate(passDesign.template) : null;
  const account = accountProfile(user);
  // The pass shows the account photo; older per-event pass photos remain as a fallback.
  const { data: legacyPhoto } = !account.avatarUrl && profile?.photo_storage_path ? await supabase.storage.from("attendee-photos").createSignedUrl(profile.photo_storage_path, 300) : { data: null };
  const photoSrc = account.avatarUrl ?? legacyPhoto?.signedUrl ?? "";
  const qrElement = template?.elements.find((element) => element.field === "qr");
  const qrForeground = template?.qrStyle.foreground ?? "#151515", qrBackground = template?.qrStyle.background ?? "#ffffff";
  const safeForeground = contrastRatio(qrForeground, qrBackground) >= 4.5 ? qrForeground : "#151515";
  const safeBackground = contrastRatio(qrForeground, qrBackground) >= 4.5 ? qrBackground : "#ffffff";
  const qrData = credential ? qrSvgDataUri(`PF1:${credential.code}`, qrElement?.width ?? 260, qrElement?.height ?? 260, safeForeground, safeBackground, template?.qrStyle.modules ?? "square") : null;
  const error = typeof query.error === "string" ? reasonText[query.error] ?? "The request could not be processed." : null;
  const ticketName = (attendee?.ticket_types as { name?: string } | null)?.name ?? "Event Pass";
  const values: Record<string, string> = { name: attendee?.name ?? "", category: ticketName, code: credential?.display_code ?? attendee?.attendee_code ?? "", event_name: event.name, event_date: event.dateLabel, venue: event.venue };
  const themeStyle = { "--event-primary": event.theme.primary, "--event-bg": event.theme.background, "--event-fg": event.theme.foreground } as CSSProperties;

  const passStyle = { ...themeStyle, "--pass-brand": event.theme.primary, "--pass-brand-ink": eventInk(event.theme.primary), "--pass-secondary": event.theme.secondary, "--pass-surface": event.theme.surface } as CSSProperties;
  return <main className="center-page pass-digital-shell" style={passStyle}><div className="center-page-inner">
    <Link href={`/e/${event.slug}?view=details`} className="back-link"><ArrowLeft size={16}/> Back to event</Link>
    <div className="page-intro"><span className="section-kicker">{event.name}</span><h1>{credential ? "Your event pass." : attendee ? event.qrConfig.claimMode === "claim" ? "Connect your wristband." : "Your QR is assigned automatically." : "Reserve your event pass."}</h1><p>{credential ? "Your digital QR pass is ready to use at the event." : attendee && event.qrConfig.claimMode === "claim" ? "Scan the physical credential after registration to link it to your identity." : "After registration, PassFlow creates a credential linked to your identity."}</p></div>
    {error && <p role="alert" className="mb-5 rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    {query.registered && <p role="status" className="mb-5 rounded-md bg-muted p-3 text-sm">{event.qrConfig.claimMode === "claim" ? "Registration complete. Now link your wristband QR code." : "Registration complete. Your QR credential was created automatically."}</p>}
    {!attendee ? <form action={registerForEvent} className="claim-card space-y-4"><input type="hidden" name="event_slug" value={slug}/><h2>Register for {event.name}</h2>{account.fullName ? <div className="claim-account"><span className="user-avatar user-avatar-large" style={account.avatarUrl ? { backgroundImage: `url("${account.avatarUrl}")` } : undefined}>{!account.avatarUrl && account.fullName.charAt(0).toUpperCase()}</span><div><small>Registering as</small><strong>{account.fullName}</strong><small>{account.email}</small></div><Link href="/profile">Edit profile</Link></div> : <label className="auth-field">Full name <small>Saved to your PassFlow profile and shown on your pass.</small><input required minLength={2} maxLength={100} name="name" autoComplete="name" placeholder="Your full name" className="min-h-12 w-full rounded-xl border border-border px-3"/></label>}<label className="auth-field">WhatsApp number <small>Optional</small><input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+62 812 3456 7890" className="min-h-12 w-full rounded-xl border border-border px-3"/></label><div className="auth-field"><span>Choose a pass</span><SmartSelect name="ticket_code" value={tickets[0]?.code ?? ""} options={tickets.map(ticket => ({ value: ticket.code, label: ticket.name, description: ticket.price > 0 ? `${ticket.currency} ${Number(ticket.price).toLocaleString("en-US")}` : "Free" }))}/></div><button className="button button-dark w-full" type="submit" disabled={!tickets.length}>Register now</button></form>
    : credential ? <section className="claim-card" data-celebrate={query.registered || query.claimed ? "" : undefined}><div className="claim-card-top"><span className="section-kicker">{event.name}</span><span className="claim-status claimed">Active</span></div>
      {studioDocument && studioQr ? <PassRenderer document={studioDocument} data={{...values,photo:photoSrc,logo:event.logoUrl??''}} qr={studioQr}/> : template && passDesign?.preview_url ? <div className="claim-figma-pass" style={{ aspectRatio: `${template.frame.width} / ${template.frame.height}` }}>
        <Image src={passDesign.preview_url} alt={`${event.name} pass design`} fill unoptimized sizes="(max-width: 600px) 90vw, 520px" className="claim-figma-background"/>
        {template.elements.map((element) => {
          if (element.field === "qr") return qrData ? <Image key={element.nodeId} src={qrData} alt="QR event pass" width={420} height={420} unoptimized style={{ ...boxStyle(element, template.frame.width, template.frame.height), objectFit: "contain", background: safeBackground }} /> : null;
          if (element.field === "photo") return photoSrc ? <Image key={element.nodeId} src={photoSrc} alt="Attendee photo" fill unoptimized sizes="120px" style={{ ...boxStyle(element, template.frame.width, template.frame.height), objectFit: "cover", clipPath: element.nodeType === "ELLIPSE" ? "ellipse(50% 50% at 50% 50%)" : undefined, borderRadius: element.nodeType === "ELLIPSE" ? 0 : element.cornerRadius ?? undefined }} /> : null;
          const value = values[element.field];
          if (!value) return null;
          return <span key={element.nodeId} style={{ ...boxStyle(element, template.frame.width, template.frame.height), display: "flex", alignItems: "center", justifyContent: element.textAlign === "CENTER" ? "center" : element.textAlign === "RIGHT" ? "flex-end" : "flex-start", overflow: "hidden", padding: 2, backgroundColor: element.fill ?? "rgba(255,255,255,.94)", color: element.fontColor ?? "#151515", fontFamily: element.fontFamily ?? "inherit", fontSize: `${Math.max(10, element.fontSize ?? 18) / template.frame.width * 100}cqw`, fontWeight: element.fontWeight ?? 500, borderRadius: element.cornerRadius ?? 0 }}>{value}</span>;
        })}
      </div> : null}
      <div className="claim-identity"><span>ATTENDEE</span><h2>{attendee.name}</h2><p>{ticketName} · {attendee.attendee_code}</p>{event.startsAt && event.endsAt && <a className="event-calendar-link" href={`/e/${event.slug}/calendar`} download>Add to calendar</a>}</div>
      {!studioDocument && (!template || !qrElement) && qrData && <Image src={qrData} alt="QR digital event pass" width={220} height={220} unoptimized className="mx-auto rounded-md"/>}
      <div className="claim-success"><span className="success-icon"><Check size={17}/></span><div><strong>{credential.display_code ?? credential.code}</strong><small>The same credential works for both the digital pass and physical QR format.</small></div></div>
      {event.qrConfig.claimMode === "claim" && <form action={replaceQr} className="mt-6"><input type="hidden" name="event_slug" value={slug}/><WristbandInput/><button className="button button-ghost mt-3 w-full" type="submit">Replace wristband</button></form>}
    </section> : event.qrConfig.claimMode === "claim" ? <form action={claimQr} className="claim-card space-y-4"><div className="claim-empty"><QrCode size={34}/><strong>Wristband not linked</strong><p>Scan the wristband QR code you received, then confirm the claim.</p></div><input type="hidden" name="event_slug" value={slug}/><WristbandInput/><button className="button button-primary w-full" type="submit">Link wristband</button></form> : <section className="claim-card"><div className="claim-empty"><strong>Credential unavailable</strong><p>This event uses automatic credentials. A credential is created at registration; for older registrations, the organizer can save Automatic mode again from Access.</p></div></section>}
  </div></main>;
}
