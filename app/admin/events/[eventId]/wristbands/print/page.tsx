import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { PrintButton } from "@/components/print-button";

const labels = { digital: "Digital pass", id_card_portrait: "ID card portrait", id_card_landscape: "ID card landscape", wristband: "Wristband" } as const;

export default async function WristbandPrintPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();
  const { supabase } = await requireOrganizerMembership(`/admin/events/${eventId}/wristbands/print`);
  const { data: credentials } = await supabase.from("qr_credentials").select("id, code, display_code, status, attendee_id, attendees(name,email)").eq("event_id", eventId).order("display_code", { ascending: true });
  const qrCodes = await Promise.all((credentials ?? []).map(async (qr) => ({ ...qr, src: await QRCode.toDataURL(`PF1:${qr.code}`, { margin: 1, width: 480, errorCorrectionLevel: "M" }) })));
  const config = event.qrConfig;
  const physical = config.mode !== "digital";
  const width = physical ? config.widthMm : 86;
  const height = physical ? config.heightMm : 54;

  return <main className="qr-export-page">
    <header className="qr-export-toolbar print:hidden"><Link href={`/admin/events/${eventId}#wristbands`} className="back-link"><ArrowLeft size={16}/> Kembali ke event</Link><div className="flex items-center gap-2"><span className="soft-badge">{labels[config.mode]}</span><a className="button button-ghost" href={`/admin/events/${eventId}/export/figma`}>Download SVG untuk Figma</a><PrintButton /></div></header>
    <div className={`qr-export-sheet qr-export-${config.mode}`}>
      <div className="qr-export-heading print:hidden"><p className="section-kicker">PassFlow export</p><h1>{event.name}</h1><p>{labels[config.mode]} · {qrCodes.length} QR credential</p></div>
      <div className="qr-export-grid">{qrCodes.map((qr) => { const attendee = Array.isArray(qr.attendees) ? qr.attendees[0] : qr.attendees; return <article className="qr-export-card" key={qr.id} style={{ width: `${width}mm`, minHeight: `${height}mm` }}>
        {config.templateUrl && <Image className="qr-export-template" src={config.templateUrl} alt="" fill unoptimized sizes={`${width}mm`} />}
        <div className="qr-export-qr" style={{ left: `${config.qrX}%`, top: `${config.qrY}%`, width: `${config.qrSize}%` }}><Image src={qr.src} width={480} height={480} unoptimized alt={`QR ${qr.display_code ?? "credential"}`} /></div>
        <div className="qr-export-copy"><strong>{attendee?.name ?? event.name}</strong><span>{attendee?.email ?? qr.display_code ?? qr.id.slice(0, 8)}</span></div><small className="qr-export-status">{qr.status}</small>
      </article>; })}</div>
    </div>
    <style>{`@page{margin:10mm}.qr-export-page{min-height:100vh;background:#f5f4ef;color:#242421;padding:20px}.qr-export-toolbar{max-width:1200px;margin:0 auto 20px;display:flex;justify-content:space-between;align-items:center}.qr-export-sheet{max-width:1200px;margin:0 auto}.qr-export-heading{margin-bottom:20px}.qr-export-heading h1{font-size:32px;margin:4px 0}.qr-export-heading p{margin:0;color:#74736d}.qr-export-grid{display:flex;flex-wrap:wrap;gap:10mm;align-items:flex-start}.qr-export-card{position:relative;overflow:hidden;border:1px solid #deddd6;border-radius:4mm;background:#fff;break-inside:avoid;page-break-inside:avoid;box-shadow:0 8px 24px rgba(0,0,0,.08)}.qr-export-template{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.qr-export-qr{position:absolute;transform:translate(-50%,-50%);aspect-ratio:1;z-index:2}.qr-export-qr img{width:100%;height:100%;display:block;background:#fff;padding:2mm;border-radius:2mm}.qr-export-copy{position:absolute;z-index:3;left:7%;right:7%;bottom:7%;display:grid;gap:1mm;color:#111;text-shadow:0 1px 1px rgba(255,255,255,.85)}.qr-export-copy strong{font-size:11pt}.qr-export-copy span{font-size:7pt}.qr-export-status{position:absolute;right:5%;top:5%;z-index:3;font-size:6pt;text-transform:uppercase;letter-spacing:.12em}.qr-export-wristband .qr-export-grid{gap:6mm}.qr-export-wristband .qr-export-card{border-radius:2mm}.qr-export-digital .qr-export-card{border-radius:6mm}@media print{.qr-export-page{padding:0;background:#fff}.qr-export-grid{gap:5mm}.qr-export-card{box-shadow:none}.qr-export-heading{display:none}}`}</style>
  </main>;
}
