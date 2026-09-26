import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, QrCode } from "lucide-react";
import { getPublishedEvent } from "@/lib/events";
import { requireUser } from "@/lib/auth/session";
import { registerForEvent, claimQr, replaceQr, uploadAttendeePhoto } from "@/app/events-actions";
import { WristbandInput } from "@/components/wristband-input";
import { readTemplate, type FigmaElement } from "@/lib/design-template";
import { qrSvgDataUri } from "@/lib/qr-svg";
import type { CSSProperties } from "react";

type ClaimPageProps = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const reasonText: Record<string, string> = { not_registered: "Daftarkan dirimu ke event ini terlebih dahulu.", invalid_code: "QR wristband tidak ditemukan.", already_claimed: "QR ini sudah terhubung ke pengunjung lain.", claim_disabled: "Event ini memakai QR otomatis, jadi wristband tidak perlu diklaim.", event_full: "Pendaftaran event sudah penuh.", ticket_full: "Kategori pass ini sudah penuh.", ticket_not_found: "Tipe pass belum tersedia.", provider: "Terjadi kesalahan. Coba lagi." };
function boxStyle(element: FigmaElement, frameWidth: number, frameHeight: number): CSSProperties {
  return { position: "absolute", left: `${element.x / frameWidth * 100}%`, top: `${element.y / frameHeight * 100}%`, width: `${element.width / frameWidth * 100}%`, height: `${element.height / frameHeight * 100}%` };
}
function contrast(a: string, b: string) {
  const lum = (hex: string) => hex.slice(1).match(/.{2}/g)!.map((v) => parseInt(v, 16) / 255).map((c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
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
    supabase.from("event_designs").select("id,kind,name,preview_url,template,ticket_type_id").eq("event_id", event.id).in("kind", ["id_card", "ticket"]).order("updated_at", { ascending: false }),
  ]);
  const tickets = ticketsResult.data ?? [];
  const credential = credentialsResult.data;
  const profile = profileResult.data;
  const ticketTypeId = attendee?.ticket_type_id;
  const passDesign = (designsResult.data ?? []).find((design) => design.kind === "id_card" && design.ticket_type_id === ticketTypeId && ticketTypeId)
    ?? (designsResult.data ?? []).find((design) => design.kind === "id_card" && !design.ticket_type_id)
    ?? (designsResult.data ?? []).find((design) => design.kind === "ticket" && design.ticket_type_id === ticketTypeId && ticketTypeId)
    ?? (designsResult.data ?? []).find((design) => design.kind === "ticket" && !design.ticket_type_id);
  const template = passDesign ? readTemplate(passDesign.template) : null;
  const { data: photoUrl } = profile?.photo_storage_path ? await supabase.storage.from("attendee-photos").createSignedUrl(profile.photo_storage_path, 300) : { data: null };
  const qrElement = template?.elements.find((element) => element.field === "qr");
  const qrForeground = template?.qrStyle.foreground ?? "#151515", qrBackground = template?.qrStyle.background ?? "#ffffff";
  const safeForeground = contrast(qrForeground, qrBackground) >= 4.5 ? qrForeground : "#151515";
  const safeBackground = contrast(qrForeground, qrBackground) >= 4.5 ? qrBackground : "#ffffff";
  const qrData = credential ? qrSvgDataUri(`PF1:${credential.code}`, qrElement?.width ?? 260, qrElement?.height ?? 260, safeForeground, safeBackground, template?.qrStyle.modules ?? "square") : null;
  const error = typeof query.error === "string" ? reasonText[query.error] ?? "Permintaan belum dapat diproses." : null;
  const ticketName = (attendee?.ticket_types as { name?: string } | null)?.name ?? "Event Pass";
  const values: Record<string, string> = { name: attendee?.name ?? "", category: ticketName, code: credential?.display_code ?? attendee?.attendee_code ?? "", event_name: event.name, event_date: event.dateLabel, venue: event.venue };
  const themeStyle = { "--event-primary": event.theme.primary, "--event-bg": event.theme.background, "--event-fg": event.theme.foreground } as CSSProperties;

  return <main className="center-page" style={themeStyle}><div className="center-page-inner">
    <Link href={`/e/${event.slug}`} className="back-link"><ArrowLeft size={16}/> Kembali ke event</Link>
    <div className="page-intro"><span className="section-kicker">{event.name}</span><h1>{credential ? "Your event pass." : attendee ? event.qrConfig.claimMode === "claim" ? "Connect your wristband." : "Your QR is assigned automatically." : "Reserve your event pass."}</h1><p>{credential ? "QR pass digitalmu siap dipakai di event." : attendee && event.qrConfig.claimMode === "claim" ? "Scan credential fisik setelah registrasi untuk menghubungkannya ke identitasmu." : "Saat registrasi selesai, PassFlow menyiapkan credential yang terhubung ke identitasmu."}</p></div>
    {error && <p role="alert" className="mb-5 rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    {query.registered && <p role="status" className="mb-5 rounded-md bg-muted p-3 text-sm">{event.qrConfig.claimMode === "claim" ? "Pendaftaran berhasil. Sekarang hubungkan QR wristband." : "Pendaftaran berhasil. QR credential dibuat otomatis untuk pass kamu."}</p>}
    {query.photo === "1" && <p role="status" className="mb-5 rounded-md bg-muted p-3 text-sm">Foto profil pass berhasil diperbarui.</p>}
    {query.photo === "failed" && <p role="alert" className="mb-5 rounded-md border border-destructive/30 p-3 text-sm text-destructive">Foto belum berhasil disimpan. Coba lagi dengan JPG, PNG, atau WebP maksimal 5 MB.</p>}
    {!attendee ? <form action={registerForEvent} className="claim-card space-y-4"><input type="hidden" name="event_slug" value={slug}/><h2>Daftar ke {event.name}</h2><input required minLength={2} name="name" placeholder="Nama lengkap" className="min-h-12 w-full rounded-md border border-border px-3"/><input name="phone" placeholder="Nomor WhatsApp (opsional)" className="min-h-12 w-full rounded-md border border-border px-3"/><select name="ticket_code" className="min-h-12 w-full rounded-md border border-border px-3">{tickets.map((ticket) => <option key={ticket.code} value={ticket.code}>{ticket.name} · {ticket.price > 0 ? `${ticket.currency} ${Number(ticket.price).toLocaleString("id-ID")}` : "Gratis"}</option>)}</select><button className="button button-dark w-full" type="submit" disabled={!tickets.length}>Daftar sekarang</button></form>
    : credential ? <section className="claim-card"><div className="claim-card-top"><span className="section-kicker">{event.name}</span><span className="claim-status claimed">Active</span></div>
      {template && passDesign?.preview_url ? <div className="claim-figma-pass" style={{ aspectRatio: `${template.frame.width} / ${template.frame.height}` }}>
        <Image src={passDesign.preview_url} alt={`Desain pass ${event.name}`} fill unoptimized sizes="(max-width: 600px) 90vw, 520px" className="claim-figma-background"/>
        {template.elements.map((element) => {
          if (element.field === "qr") return qrData ? <Image key={element.nodeId} src={qrData} alt="QR event pass" width={420} height={420} unoptimized style={{ ...boxStyle(element, template.frame.width, template.frame.height), objectFit: "contain", background: safeBackground }} /> : null;
          if (element.field === "photo") return photoUrl?.signedUrl ? <Image key={element.nodeId} src={photoUrl.signedUrl} alt="Foto attendee" fill unoptimized sizes="120px" style={{ ...boxStyle(element, template.frame.width, template.frame.height), objectFit: "cover", clipPath: element.nodeType === "ELLIPSE" ? "ellipse(50% 50% at 50% 50%)" : undefined, borderRadius: element.nodeType === "ELLIPSE" ? 0 : element.cornerRadius ?? undefined }} /> : null;
          const value = values[element.field];
          if (!value) return null;
          return <span key={element.nodeId} style={{ ...boxStyle(element, template.frame.width, template.frame.height), display: "flex", alignItems: "center", justifyContent: element.textAlign === "CENTER" ? "center" : element.textAlign === "RIGHT" ? "flex-end" : "flex-start", overflow: "hidden", padding: 2, backgroundColor: element.fill ?? "rgba(255,255,255,.94)", color: element.fontColor ?? "#151515", fontFamily: element.fontFamily ?? "inherit", fontSize: `${Math.max(10, element.fontSize ?? 18) / template.frame.width * 100}cqw`, fontWeight: element.fontWeight ?? 500, borderRadius: element.cornerRadius ?? 0 }}>{value}</span>;
        })}
      </div> : null}
      <div className="claim-identity"><span>ATTENDEE</span><h2>{attendee.name}</h2><p>{ticketName} · {attendee.attendee_code}</p></div>
      {(!template || !qrElement) && qrData && <Image src={qrData} alt="QR digital event pass" width={220} height={220} unoptimized className="mx-auto rounded-md"/>}
      <div className="claim-success"><span className="success-icon"><Check size={17}/></span><div><strong>{credential.display_code ?? credential.code}</strong><small>Credential yang sama berlaku untuk digital pass dan QR fisik.</small></div></div>
      {event.qrConfig.claimMode === "claim" && <form action={replaceQr} className="mt-6"><input type="hidden" name="event_slug" value={slug}/><WristbandInput/><button className="button button-ghost mt-3 w-full" type="submit">Ganti wristband</button></form>}
    </section> : event.qrConfig.claimMode === "claim" ? <form action={claimQr} className="claim-card space-y-4"><div className="claim-empty"><QrCode size={34}/><strong>Wristband belum terhubung</strong><p>Scan QR wristband yang kamu terima lalu konfirmasi claim.</p></div><input type="hidden" name="event_slug" value={slug}/><WristbandInput/><button className="button button-primary w-full" type="submit">Hubungkan wristband</button></form> : <section className="claim-card"><div className="claim-empty"><strong>Credential belum tersedia</strong><p>Mode event ini otomatis. Credential akan dibuat saat registrasi; jika data ini berasal dari registrasi lama, organizer dapat menyimpan ulang mode Automatic dari menu Access.</p></div></section>}
    {attendee && <form action={uploadAttendeePhoto} encType="multipart/form-data" className="claim-card mt-4 space-y-3"><input type="hidden" name="event_slug" value={slug}/><div><h2>Foto pass <span className="text-sm font-normal text-muted-foreground">· opsional</span></h2><p className="text-sm text-muted-foreground">Foto hanya ditambahkan jika template event memiliki slot foto. PassFlow menyimpannya secara privat.</p></div>{photoUrl?.signedUrl && <Image src={photoUrl.signedUrl} alt="Foto profil pass" width={80} height={80} unoptimized className="h-20 w-20 rounded-full object-cover"/>}<input type="file" name="photo" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm"/><button type="submit" className="button button-ghost">{photoUrl?.signedUrl ? "Perbarui foto" : "Unggah foto"}</button></form>}
  </div></main>;
}
