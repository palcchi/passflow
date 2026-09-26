import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, QrCode } from "lucide-react";
import { getPublishedEvent } from "@/lib/events";
import { requireUser } from "@/lib/auth/session";
import { registerForEvent, claimQr, replaceQr } from "@/app/events-actions";
import { WristbandInput } from "@/components/wristband-input";
import QRCode from "qrcode";
import type { CSSProperties } from "react";

type ClaimPageProps={params:Promise<{slug:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
const reasonText:Record<string,string>={not_registered:"Daftarkan dirimu ke event ini terlebih dahulu.",invalid_code:"QR wristband tidak ditemukan.",already_claimed:"QR ini sudah terhubung ke pengunjung lain.",event_full:"Pendaftaran event sudah penuh.",ticket_full:"Kategori pass ini sudah penuh.",ticket_not_found:"Tipe pass belum tersedia.",provider:"Terjadi kesalahan. Coba lagi."};
export default async function ClaimPage({params,searchParams}:ClaimPageProps){
 const {slug}=await params;const query=await searchParams;const event=await getPublishedEvent(slug);if(!event)notFound();const {supabase,user}=await requireUser(`/e/${slug}/claim`);
 const {data:attendee}=await supabase.from("attendees").select("id,name,email,phone,attendee_code,ticket_types(name,code)").eq("event_id",event.id).eq("user_id",user.id).maybeSingle();
 const {data:tickets}=await supabase.from("ticket_types").select("code,name,price,currency").eq("event_id",event.id).order("created_at");
 const {data:credential}=attendee?await supabase.from("qr_credentials").select("code,display_code,status").eq("event_id",event.id).eq("attendee_id",attendee.id).eq("status","active").maybeSingle():{data:null};
 const qrData=credential?await QRCode.toDataURL(`PF1:${credential.code}`,{margin:1,width:260,color:{dark:"#151515",light:"#ffffff"} }):null;
 const error=typeof query.error==="string"?reasonText[query.error]??"Permintaan belum dapat diproses.":null;
 return <main className="center-page" style={{"--event-primary":event.theme.primary,"--event-bg":event.theme.background,"--event-fg":event.theme.foreground} as CSSProperties}><div className="center-page-inner"><Link href={`/e/${event.slug}`} className="back-link"><ArrowLeft size={16}/> Kembali ke event</Link><div className="page-intro"><span className="section-kicker">{event.name}</span><h1>{credential?"Your event pass.":attendee?"Connect your wristband.":"Reserve your event pass."}</h1><p>{credential?"QR yang sama bisa dipakai dari wristband dan layar HP.":"Semua akses event akan terhubung ke satu identitasmu."}</p></div>
 {error&&<p role="alert" className="mb-5 rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
 {query.registered&&<p role="status" className="mb-5 rounded-md bg-muted p-3 text-sm">Pendaftaran berhasil. Sekarang hubungkan QR wristband.</p>}
 {!attendee?<form action={registerForEvent} className="claim-card space-y-4"><input type="hidden" name="event_slug" value={slug}/><h2>Daftar ke {event.name}</h2><input required minLength={2} name="name" placeholder="Nama lengkap" className="min-h-12 w-full rounded-md border border-border px-3"/><input name="phone" placeholder="Nomor WhatsApp (opsional)" className="min-h-12 w-full rounded-md border border-border px-3"/><select name="ticket_code" className="min-h-12 w-full rounded-md border border-border px-3">{(tickets ?? []).map(ticket=><option key={ticket.code} value={ticket.code}>{ticket.name}</option>)}</select><button className="button button-dark w-full" type="submit" disabled={!tickets?.length}>Daftar sekarang</button></form>:credential?<section className="claim-card"><div className="claim-card-top"><span className="section-kicker">{event.name}</span><span className="claim-status claimed">Active</span></div><div className="claim-identity"><span>ATTENDEE</span><h2>{attendee.name}</h2><p>{(attendee.ticket_types as {name?:string}|null)?.name??"Event Pass"} · {attendee.attendee_code}</p></div>{qrData&&<Image src={qrData} alt="QR digital event pass" width={260} height={260} unoptimized className="mx-auto rounded-md"/>}<div className="claim-success"><span className="success-icon"><Check size={17}/></span><div><strong>{credential.display_code??credential.code}</strong><small>QR wristband dan Digital Event Pass menggunakan credential yang sama.</small></div></div><form action={replaceQr} className="mt-6"><input type="hidden" name="event_slug" value={slug}/><WristbandInput /><button className="button button-ghost mt-3 w-full" type="submit">Ganti wristband</button></form></section>:<form action={claimQr} className="claim-card space-y-4"><div className="claim-empty"><QrCode size={42}/><strong>Wristband belum terhubung</strong><p>Scan QR wristband yang kamu terima lalu konfirmasi claim.</p></div><input type="hidden" name="event_slug" value={slug}/><WristbandInput /><button className="button button-primary w-full" type="submit">Hubungkan wristband</button></form>}
 </div></main>;
}
