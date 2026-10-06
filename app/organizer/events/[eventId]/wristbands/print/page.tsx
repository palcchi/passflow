import { attendeePhotoColumns, attendeePhotoUrls } from "@/lib/attendee-photos";
import { PassRenderer } from "@/components/studio-renderer";
import { selectStudioDesign } from "@/lib/studio/select";
import { defaultDocument, newLayer, type StudioDocument } from "@/lib/studio/model";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { PrintButton } from "@/components/print-button";
import { DownloadAll, ExportCard } from "@/components/pass-export";

const kinds = [["id_card", "ID cards"], ["digital", "Digital passes"], ["wristband", "Wristbands"]] as const;
type Kind = (typeof kinds)[number][0];

// Until a Figma pass is published: event name, attendee name (code on wristbands) and the QR.
function standardPass(kind: Kind): StudioDocument {
  const d = defaultDocument(kind);
  if (kind === "wristband") d.layers = d.layers.map((l) => l.field === "name" ? { ...l, field: "code" } : l);
  else d.layers.push({ ...newLayer("text", "code"), field: "code", x: 5, y: 76, width: 44, height: 6, fontSize: 3, align: "center" });
  return d;
}

export default async function PassExportPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ page?: string; kind?: string }> }) {
  const { eventId } = await params;
  const query = await searchParams;
  const page = Math.max(0, Math.min(10000, Number.parseInt(query.page ?? "0", 10) || 0));
  const pageSize = 200;
  const event = await getManagedEvent(eventId);
  if (!event) notFound();
  const { supabase } = await requireOrganizerMembership(`/organizer/events/${eventId}/wristbands/print`);
  const kind: Kind = kinds.some(([k]) => k === query.kind) ? query.kind as Kind : event.qrConfig.mode === "wristband" ? "wristband" : event.qrConfig.mode === "digital" ? "digital" : "id_card";
  // ID cards and digital passes carry a name, so only claimed codes print; wristbands print unclaimed.
  let credentialQuery = supabase.from("qr_credentials").select("id, code, display_code, status, attendee_id, attendees(name,ticket_type_id,ticket_types(name))", { count: "exact" }).eq("event_id", eventId).in("status", ["active", "unclaimed"]);
  if (kind !== "wristband") credentialQuery = credentialQuery.not("attendee_id", "is", null);
  const [{ data: credentials, count }, { data: studioDesigns }] = await Promise.all([
    credentialQuery.order("display_code", { ascending: true }).range(page * pageSize, (page + 1) * pageSize - 1),
    supabase.from("event_studio_documents").select("kind,ticket_type_id,document").eq("event_id", eventId).eq("status", "published"),
  ]);
  const rows = credentials ?? [];
  const qrCodes = await Promise.all(rows.map((qr) => QRCode.toDataURL(`PF1:${qr.code}`, { margin: 4, width: 600, errorCorrectionLevel: "M" })));
  const attendeeIds = rows.flatMap((qr) => qr.attendee_id ? [qr.attendee_id] : []);
  const { data: profiles } = attendeeIds.length ? await supabase.from("attendee_profiles").select(attendeePhotoColumns).in("attendee_id", attendeeIds) : { data: [] };
  const photos = await attendeePhotoUrls(supabase, profiles, 600);
  const fromFigma = (studioDesigns ?? []).some((d) => d.kind === kind);
  const fallback = standardPass(kind);
  const total = count ?? 0;

  return <main className="qr-export-page">
    <header className="qr-export-toolbar print:hidden">
      <Link href={`/organizer/events/${eventId}/access`} className="back-link"><ArrowLeft size={16}/> Back to Access</Link>
      <div className="qr-export-actions"><DownloadAll/><PrintButton/></div>
    </header>
    <div className="qr-export-heading print:hidden">
      <p className="section-kicker">Preview & export</p>
      <h1>{event.name}</h1>
      <p>{fromFigma ? "Your published Figma design" : "Standard PassFlow layout. Publish a pass from Figma to use your own design and size."} · {total} {total === 1 ? "code" : "codes"}</p>
      <nav className="qr-export-tabs" aria-label="Pass type">{kinds.map(([k, label]) => <Link key={k} href={`?kind=${k}`} aria-current={k === kind ? "page" : undefined}>{label}</Link>)}</nav>
    </div>
    <div className="qr-export-grid">{rows.map((qr, i) => {
      const attendee = Array.isArray(qr.attendees) ? qr.attendees[0] : qr.attendees;
      const document = selectStudioDesign(studioDesigns ?? [], [kind], attendee?.ticket_type_id) ?? fallback;
      const category = (Array.isArray(attendee?.ticket_types) ? attendee.ticket_types[0] : attendee?.ticket_types)?.name ?? "";
      return <ExportCard key={qr.id} fileName={[qr.display_code, attendee?.name].filter(Boolean).join(" ").replace(/[^\w\- ]+/g, "").trim() || qr.id.slice(0, 8)} widthMm={document.width} heightMm={document.height}>
        <PassRenderer document={document} qr={qrCodes[i]} data={{ name: attendee?.name ?? "", category, event_name: event.name, event_date: event.dateLabel, venue: event.venue, code: qr.display_code ?? "", logo: event.logoUrl ?? "", photo: photos.get(qr.attendee_id ?? "") ?? "" }}/>
      </ExportCard>;
    })}</div>
    {!rows.length && <p className="event-admin-table-empty print:hidden">{kind === "wristband" ? "No QR codes yet. Generate a batch in Access." : "No claimed passes yet. Cards print once attendees register."}</p>}
    <nav className="qr-export-pager print:hidden" aria-label="Batches">
      {page > 0 && <Link className="button button-ghost" href={`?kind=${kind}&page=${page - 1}`}>Previous batch</Link>}
      {total > pageSize && <span>Batch {page + 1} of {Math.ceil(total / pageSize)}</span>}
      {(page + 1) * pageSize < total && <Link className="button button-ghost" href={`?kind=${kind}&page=${page + 1}`}>Next batch</Link>}
    </nav>
    <style>{`@page{margin:8mm}.qr-export-page{min-height:100vh;background:var(--background);color:var(--foreground);padding:24px 20px 60px}.qr-export-toolbar,.qr-export-heading,.qr-export-grid,.qr-export-pager{max-width:1200px;margin-inline:auto}.qr-export-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:28px}.qr-export-actions,.pass-export-all{display:flex;align-items:center;gap:10px}.pass-export-all select{min-height:44px;border:1px solid var(--border);border-radius:999px;padding:0 14px;background:var(--card);color:var(--foreground)}.qr-export-heading{margin-bottom:28px}.qr-export-heading h1{font-size:clamp(32px,4vw,48px);letter-spacing:-.04em;margin:6px 0 8px}.qr-export-heading p{margin:0;color:var(--muted-foreground)}.qr-export-tabs{display:flex;gap:6px;margin-top:20px;flex-wrap:wrap}.qr-export-tabs a{padding:8px 14px;border-radius:999px;border:1px solid var(--border);font-size:13px;color:var(--muted-foreground);text-decoration:none}.qr-export-tabs a[aria-current]{background:var(--foreground);border-color:var(--foreground);color:var(--background)}.qr-export-grid{display:flex;flex-wrap:wrap;gap:24px 10mm;align-items:flex-start}.pass-export-card{margin:0;max-width:100%;break-inside:avoid;page-break-inside:avoid}.pass-export-art{overflow:hidden;border-radius:2mm;background:#fff;box-shadow:0 0 0 1px var(--border),0 10px 30px rgba(0,0,0,.06);print-color-adjust:exact;-webkit-print-color-adjust:exact}.pass-export-card figcaption{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;color:var(--muted-foreground)}.pass-export-card figcaption span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pass-export-card figcaption button{padding:4px 10px;border-radius:999px;border:1px solid var(--border);background:var(--card);color:var(--foreground);font-size:11px;font-weight:600}.qr-export-pager{display:flex;align-items:center;gap:12px;margin-top:32px}@media(max-width:640px){.qr-export-toolbar{flex-wrap:wrap}}@media print{.qr-export-page{padding:0;background:#fff}.qr-export-grid{gap:4mm}.pass-export-art{box-shadow:none;border-radius:0}}`}</style>
  </main>;
}
