import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { readTemplate, xml } from "@/lib/design-template";

async function dataImage(url: string | null) {
  if (!url) return null;
  try { const response = await fetch(url, { cache: "no-store" }); if (!response.ok) return null; const type = response.headers.get("content-type") || "image/png"; return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`; } catch { return null; }
}
function safeFile(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "passflow-export"; }

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const url = new URL(request.url), designId = url.searchParams.get("designId");
  const event = await getManagedEvent(eventId);
  if (!event || !designId) return new NextResponse("Desain tidak ditemukan", { status: 404 });
  const { supabase } = await requireOrganizerMembership(`/admin/events/${eventId}/design`);
  const [{ data: design }, { data: credentials }] = await Promise.all([
    supabase.from("event_designs").select("id,name,kind,preview_url,template").eq("id", designId).eq("event_id", eventId).maybeSingle(),
    supabase.from("qr_credentials").select("id,code,display_code,status").eq("event_id", eventId).order("display_code"),
  ]);
  if (!design) return new NextResponse("Desain tidak ditemukan", { status: 404 });
  const template = readTemplate(design.template);
  if (!template.hasQr || !template.qrPlaceholder) return new NextResponse("Layer QR belum ditemukan. Namai layer QR PASSFLOW_QR di Figma lalu Sync ulang.", { status: 422 });
  const background = await dataImage(design.preview_url);
  const frame = template.frame, qr = template.qrPlaceholder;
  const columns = frame.width > frame.height * 1.3 ? 2 : 1, gap = Math.max(24, Math.round(frame.width * .08));
  const rows = Math.max(1, Math.ceil((credentials?.length ?? 0) / columns));
  const width = columns * frame.width + (columns - 1) * gap, height = rows * frame.height + (rows - 1) * gap;
  const cards = await Promise.all((credentials ?? []).map(async (credential, index) => {
    const x = (index % columns) * (frame.width + gap), y = Math.floor(index / columns) * (frame.height + gap);
    const qrData = await QRCode.toDataURL(`PF1:${credential.code}`, { margin: 0, width: Math.ceil(qr.width), errorCorrectionLevel: "M" });
    return `<g id="passflow-${xml(credential.display_code ?? credential.id)}"><rect x="${x}" y="${y}" width="${frame.width}" height="${frame.height}" fill="#fff"/>${background ? `<image href="${background}" x="${x}" y="${y}" width="${frame.width}" height="${frame.height}" preserveAspectRatio="none"/>` : ""}<image href="${qrData}" x="${x + qr.x}" y="${y + qr.y}" width="${qr.width}" height="${qr.height}" preserveAspectRatio="none"/></g>`;
  }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${xml(design.name)} · ${xml(event.name)}</title>${cards.join("")}</svg>`;
  return new NextResponse(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "content-disposition": `attachment; filename="${safeFile(event.name)}-${safeFile(design.name)}-save-as.svg"`, "cache-control": "no-store" } });
}
