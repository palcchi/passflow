import { attendeePhotoColumns, attendeePhotoUrls } from "@/lib/attendee-photos";
import { PassRenderer } from "@/components/studio-renderer";
import { selectStudioDesign } from "@/lib/studio/select";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { PrintButton } from "@/components/print-button";

const labels = { digital: "Digital pass", id_card_portrait: "ID card portrait", id_card_landscape: "ID card landscape", wristband: "Wristband" } as const;

export default async function WristbandPrintPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ page?: string; kind?: string }> }) {
  const { eventId } = await params;
  const query = await searchParams;
  const page = Math.max(0, Math.min(10000, Number.parseInt(query.page ?? "0", 10) || 0));
  const pageSize = 200;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();
  const { supabase } = await requireOrganizerMembership(`/admin/events/${eventId}/wristbands/print`);
  const { data: credentials, count } = await supabase.from("qr_credentials").select("id, code, display_code, status, attendee_id, attendees(name,email,ticket_type_id,ticket_types(name))", {count:"exact"}).eq("event_id", eventId).in("status", ["active", "unclaimed"]).order("display_code", { ascending: true }).range(page * pageSize, (page + 1) * pageSize - 1);
  const {data:studioDesigns} = await supabase.from("event_studio_documents").select("kind,ticket_type_id,document").eq("event_id",eventId).eq("status","published");
  const printKind = ["digital","id_card","wristband"].includes(query.kind ?? "") ? query.kind! : event.qrConfig.mode === "wristband" ? "wristband" : event.qrConfig.mode === "digital" ? "digital" : "id_card";
  const sourceCredentials = printKind === "id_card"
    ? (credentials ?? []).filter((qr) => qr.attendee_id)
    : (credentials ?? []);
  const qrCodes = await Promise.all(sourceCredentials.map(async (qr) => ({ ...qr, src: await QRCode.toDataURL(`PF1:${qr.code}`, { margin: 4, width: 600, errorCorrectionLevel: "M" }) })));
  const attendeeIds=sourceCredentials.flatMap(qr=>qr.attendee_id?[qr.attendee_id]:[]);
  const {data:profiles}=attendeeIds.length?await supabase.from('attendee_profiles').select(attendeePhotoColumns).in('attendee_id',attendeeIds):{data:[]};
  const photos=await attendeePhotoUrls(supabase,profiles,600);
  const config = event.qrConfig;
  const physical = config.mode !== "digital";
  const width = physical ? config.widthMm : 86;
  const height = physical ? config.heightMm : 54;

  return <main className="qr-export-page">
    <header className="qr-export-toolbar print:hidden"><Link href={`/admin/events/${eventId}/access`} className="back-link"><ArrowLeft size={16}/> Back to event</Link><div className="flex items-center gap-2"><span className="soft-badge">{labels[config.mode]}</span><Link className="button button-ghost" href={`/admin/events/${eventId}/design/studio`}>Edit design</Link><PrintButton /></div></header>
    <nav className="print:hidden resource-toolbar" aria-label="Print batches">{["digital","id_card","wristband"].map(kind=><Link key={kind} className="button button-ghost" href={`?kind=${kind}`}>{kind.replace('_',' ')}</Link>)}{page>0&&<Link href={`?kind=${printKind}&page=${page-1}`}>Previous batch</Link>}<span>Batch {page+1} · {count??0} valid credentials</span>{(page+1)*pageSize<(count??0)&&<Link href={`?kind=${printKind}&page=${page+1}`}>Next batch</Link>}</nav>
    <div className={`qr-export-sheet qr-export-${config.mode}`}>
      <div className="qr-export-heading print:hidden"><p className="section-kicker">PassFlow export</p><h1>{event.name}</h1><p>{labels[config.mode]} · {qrCodes.length} QR credential</p></div>
      <div className="qr-export-grid">{qrCodes.map((qr) => { const attendee = Array.isArray(qr.attendees) ? qr.attendees[0] : qr.attendees; const document=selectStudioDesign(studioDesigns??[],[printKind],attendee?.ticket_type_id);
        if(document) return <article key={qr.id} className="studio-print-card" style={{width:`${document.width}mm`,height:`${document.height}mm`,breakInside:'avoid'}}><PassRenderer document={document} qr={qr.src} data={{name:attendee?.name??'',category:(Array.isArray(attendee?.ticket_types)?attendee.ticket_types[0]:attendee?.ticket_types)?.name??'',event_name:event.name,event_date:event.dateLabel,venue:event.venue,code:qr.display_code??'',logo:event.logoUrl??'',photo:photos.get(qr.attendee_id??'')??''}}/></article>;
        return <article className="qr-export-card" key={qr.id} style={{ width: `${width}mm`, minHeight: `${height}mm` }}>
        {config.templateUrl && <Image className="qr-export-template" src={config.templateUrl} alt="" fill unoptimized sizes={`${width}mm`} />}
        <div className="qr-export-qr" style={{ left: `${config.qrX}%`, top: `${config.qrY}%`, width: `${config.qrSize}%` }}><Image src={qr.src} width={480} height={480} unoptimized alt={`QR ${qr.display_code ?? "credential"}`} /></div>
        <div className="qr-export-copy"><strong>{attendee?.name ?? event.name}</strong><span>{attendee?.email ?? qr.display_code ?? qr.id.slice(0, 8)}</span></div><small className="qr-export-status">{qr.status}</small>
      </article>; })}</div>
    </div>
    <style>{`@page{margin:10mm}.studio-print-card{flex-shrink:0;overflow:hidden;print-color-adjust:exact;-webkit-print-color-adjust:exact}.qr-export-page{min-height:100vh;background:#f5f4ef;color:#242421;padding:20px}.qr-export-toolbar{max-width:1200px;margin:0 auto 20px;display:flex;justify-content:space-between;align-items:center}.qr-export-sheet{max-width:1200px;margin:0 auto}.qr-export-heading{margin-bottom:20px}.qr-export-heading h1{font-size:32px;margin:4px 0}.qr-export-heading p{margin:0;color:#74736d}.qr-export-grid{display:flex;flex-wrap:wrap;gap:10mm;align-items:flex-start}.qr-export-card{position:relative;overflow:hidden;border:1px solid #deddd6;border-radius:4mm;background:#fff;break-inside:avoid;page-break-inside:avoid;box-shadow:0 8px 24px rgba(0,0,0,.08)}.qr-export-template{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.qr-export-qr{position:absolute;transform:translate(-50%,-50%);aspect-ratio:1;z-index:2}.qr-export-qr img{width:100%;height:100%;display:block;background:#fff;padding:2mm;border-radius:2mm}.qr-export-copy{position:absolute;z-index:3;left:7%;right:7%;bottom:7%;display:grid;gap:1mm;color:#111;text-shadow:0 1px 1px rgba(255,255,255,.85)}.qr-export-copy strong{font-size:11pt}.qr-export-copy span{font-size:7pt}.qr-export-status{position:absolute;right:5%;top:5%;z-index:3;font-size:6pt;text-transform:uppercase;letter-spacing:.12em}.qr-export-wristband .qr-export-grid{gap:6mm}.qr-export-wristband .qr-export-card{border-radius:2mm}.qr-export-digital .qr-export-card{border-radius:6mm}@media print{.qr-export-page{padding:0;background:#fff}.qr-export-grid{gap:5mm}.qr-export-card{box-shadow:none}.qr-export-heading{display:none}}`}</style>
  </main>;
}
