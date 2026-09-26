import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";

function escapeXml(value: string) { return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[char] ?? char); }

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getManagedEvent(eventId);
  if (!event) return new NextResponse("Not found", { status: 404 });
  const { supabase } = await requireOrganizerMembership(`/admin/events/${eventId}/export/figma`);
  const { data: credentials } = await supabase.from("qr_credentials").select("id, code, display_code, status").eq("event_id", eventId).order("display_code");
  const config = event.qrConfig;
  const cardWidth = Math.max(240, Math.round((config.mode === "wristband" ? config.widthMm : config.widthMm || 85.6) * 3.78));
  const cardHeight = Math.max(150, Math.round((config.mode === "wristband" ? config.heightMm : config.heightMm || 54) * 3.78));
  const gap = 32;
  const columns = config.mode === "wristband" ? 2 : 3;
  const rows = Math.max(1, Math.ceil((credentials?.length ?? 0) / columns));
  const headerHeight = 180;
  const width = columns * cardWidth + (columns - 1) * gap;
  const height = headerHeight + gap + rows * cardHeight + (rows - 1) * gap;
  let templateHref = "";
  if (config.templateUrl) {
    try { const response = await fetch(config.templateUrl); if (response.ok) { const type = response.headers.get("content-type") || "image/png"; templateHref = `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`; } } catch { /* optional template */ }
  }
  const cards = await Promise.all((credentials ?? []).map(async (credential, index) => {
    const qr = await QRCode.toDataURL(`PF1:${credential.code}`, { margin: 1, width: 600 });
    const x = (index % columns) * (cardWidth + gap); const y = headerHeight + gap + Math.floor(index / columns) * (cardHeight + gap);
    const qrSize = cardWidth * (config.qrSize / 100); const qrX = x + cardWidth * (config.qrX / 100) - qrSize / 2; const qrY = y + cardHeight * (config.qrY / 100) - qrSize / 2;
    return `<g id="passflow-${escapeXml(credential.display_code ?? credential.id)}"><rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="18" fill="#fff" stroke="#deddd6"/>${templateHref ? `<image href="${templateHref}" x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" preserveAspectRatio="xMidYMid slice"/>` : ""}<image href="${qr}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/><text x="${x + cardWidth * .07}" y="${y + cardHeight * .86}" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#111">${escapeXml(event.name)}</text><text x="${x + cardWidth * .07}" y="${y + cardHeight * .92}" font-family="Arial, sans-serif" font-size="12" fill="#555">${escapeXml(credential.display_code ?? credential.id.slice(0, 8))}</text></g>`;
  }));
  const theme = event.theme;
  const header = `<g id="passflow-event-header"><rect x="0" y="0" width="${width}" height="${headerHeight}" fill="${escapeXml(theme.background)}"/><rect x="0" y="${headerHeight - 8}" width="${width}" height="8" fill="${escapeXml(theme.primary)}"/><text x="32" y="58" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="3" fill="${escapeXml(theme.primary)}">PASSFLOW / EVENT PASS</text><text x="32" y="112" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${escapeXml(theme.foreground)}">${escapeXml(event.name)}</text><text x="32" y="144" font-family="Arial, sans-serif" font-size="14" fill="${escapeXml(theme.foreground)}">Editable SVG layout for Figma</text></g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${escapeXml(event.name)} PassFlow QR export</title>${header}${cards.join("")}</svg>`;
  return new NextResponse(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "content-disposition": `attachment; filename="${event.slug}-passflow-figma.svg"` } });
}
