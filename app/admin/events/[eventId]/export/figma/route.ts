import { NextResponse } from "next/server";
import { getManagedEvent } from "@/lib/events";
import { requireOrganizerMembership } from "@/lib/auth/session";
import { readTemplate, xml, type FigmaElement } from "@/lib/design-template";
import { qrSvgMarkup } from "@/lib/qr-svg";

async function dataImage(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !(parsed.hostname === "figma.com" || parsed.hostname.endsWith(".figma.com") || parsed.hostname.endsWith(".s3.us-west-2.amazonaws.com") || parsed.hostname.endsWith(".supabase.co"))) return null;
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok || Number(response.headers.get("content-length") ?? 0) > 8_000_000) return null;
    const type = response.headers.get("content-type") || "image/png";
    if (!/^image\/(png|jpeg|webp|svg\+xml)/i.test(type)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 8_000_000) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch { return null; }
}
function safeFile(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "passflow-export"; }
function luminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)!.map((value) => parseInt(value, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}
function qrContrast(foreground: string, background: string) {
  const l1 = luminance(foreground), l2 = luminance(background);
  return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
}
function wrappedLines(value: string, maxChars: number, maxLines: number) {
  const words = value.split(/\s+/); const lines: string[] = []; let line = "";
  for (const word of words) { const next = line ? `${line} ${word}` : word; if (next.length > maxChars && line) { lines.push(line); line = word; } else line = next; }
  if (line) lines.push(line);
  if (lines.length > maxLines) lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(1, maxChars - 1))}…`;
  return lines.slice(0, maxLines);
}
function renderText(el: FigmaElement, value: string, frameX: number, frameY: number) {
  const size = Math.min(el.fontSize ?? Math.min(el.height * 0.42, 48), Math.max(8, el.height * 0.8));
  const maxChars = Math.max(1, Math.floor(el.width / (size * 0.54))), maxLines = Math.max(1, Math.floor(el.height / (size * 1.2)));
  const lines = wrappedLines(value, maxChars, maxLines), anchor = el.textAlign?.toLowerCase() === "center" ? "middle" : el.textAlign?.toLowerCase() === "right" ? "end" : "start";
  const tx = frameX + el.x + (anchor === "start" ? 0 : anchor === "middle" ? el.width / 2 : el.width);
  const lineHeight = size * 1.16, firstY = frameY + el.y + Math.max(size / 2, (el.height - (lines.length - 1) * lineHeight) / 2);
  const mask = `<rect x="${frameX + el.x}" y="${frameY + el.y}" width="${el.width}" height="${el.height}" rx="${el.cornerRadius ?? 0}" fill="${el.fill ?? "#ffffff"}"/>`;
  const text = lines.map((line, i) => `<text x="${tx}" y="${firstY + i * lineHeight}" text-anchor="${anchor}" dominant-baseline="middle" fill="${el.fontColor ?? "#151515"}" font-size="${size}" font-family="${xml(el.fontFamily ?? "Arial, sans-serif")}" font-weight="${el.fontWeight ?? 500}">${xml(line)}</text>`).join("");
  return mask + text;
}
export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const url = new URL(request.url), designId = url.searchParams.get("designId");
  const event = await getManagedEvent(eventId);
  if (!event || !designId) return new NextResponse("Desain tidak ditemukan", { status: 404 });
  const { supabase } = await requireOrganizerMembership(`/admin/events/${eventId}/design`);
  const [{ data: design }, { data: credentials }] = await Promise.all([
    supabase.from("event_designs").select("id,name,kind,preview_url,template,ticket_type_id").eq("id", designId).eq("event_id", eventId).maybeSingle(),
    supabase.from("qr_credentials").select("id,code,display_code,status,attendee_id").eq("event_id", eventId).eq("status", "active").order("display_code"),
  ]);
  if (!design) return new NextResponse("Desain tidak ditemukan", { status: 404 });
  const template = readTemplate(design.template), frame = template.frame;
  if (!template.elements.length) return new NextResponse("Belum ada elemen PassFlow. Tambahkan marker di Figma lalu Sync ulang.", { status: 422 });
  const qr = template.elements.find((element) => element.field === "qr");
  if (qr && qrContrast(template.qrStyle.foreground, template.qrStyle.background) < 4.5) return new NextResponse("Kontras warna QR terlalu rendah. Pilih warna gelap dan latar terang agar dapat dipindai.", { status: 422 });
  const background = await dataImage(design.preview_url);
  const attendeeIds = [...new Set((credentials ?? []).flatMap((item) => item.attendee_id ? [item.attendee_id] : []))];
  const [{ data: attendees }, { data: profiles }] = attendeeIds.length ? await Promise.all([
    supabase.from("attendees").select("id,name,email,phone,attendee_code,ticket_type_id,ticket_types(name)").in("id", attendeeIds),
    supabase.from("attendee_profiles").select("attendee_id,photo_storage_path").in("attendee_id", attendeeIds),
  ]) : [{ data: [] }, { data: [] }];
  const attendeeMap = new Map((attendees ?? []).map((item) => [item.id, item]));
  const activeCredentials = (credentials ?? []).filter((item) => !design.ticket_type_id || (item.attendee_id && attendeeMap.get(item.attendee_id)?.ticket_type_id === design.ticket_type_id));
  if (!activeCredentials.length) return new NextResponse("Belum ada peserta dengan QR aktif untuk kategori desain ini.", { status: 422 });
  const profileMap = new Map((profiles ?? []).flatMap((item) => item.photo_storage_path ? [[item.attendee_id, item.photo_storage_path] as const] : []));
  const photos = new Map<string, string>();
  await Promise.all([...profileMap.entries()].map(async ([attendeeId, path]) => {
    const { data } = await supabase.storage.from("attendee-photos").createSignedUrl(path, 90);
    const image = data ? await dataImage(data.signedUrl) : null;
    if (image) photos.set(attendeeId, image);
  }));
  const imageDefinitions = `${background ? `<image id="passflow-design-background" href="${background}" width="${frame.width}" height="${frame.height}" preserveAspectRatio="none"/>` : ""}${[...photos.entries()].flatMap(([attendeeId, image]) => template.elements.filter((element) => element.field === "photo").map((element) => {
    const id = `passflow-photo-${xml(attendeeId)}-${xml(element.nodeId)}`;
    const shape = element.nodeType === "ELLIPSE" ? `<ellipse cx="${element.width / 2}" cy="${element.height / 2}" rx="${element.width / 2}" ry="${element.height / 2}"/>` : `<rect width="${element.width}" height="${element.height}" rx="${element.cornerRadius ?? 0}"/>`;
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${element.width}" height="${element.height}"><image href="${image}" width="${element.width}" height="${element.height}" preserveAspectRatio="xMidYMid slice"/></pattern><clipPath id="${id}-clip">${shape}</clipPath>`;
  })).join("")}`;
  const columns = frame.width > frame.height * 1.3 ? 2 : 1, gap = Math.max(24, Math.round(frame.width * .08));
  const rows = Math.max(1, Math.ceil(activeCredentials.length / columns));
  const width = columns * frame.width + (columns - 1) * gap, height = rows * frame.height + (rows - 1) * gap;
  const cards = await Promise.all(activeCredentials.map(async (credential, index) => {
    const x = (index % columns) * (frame.width + gap), y = Math.floor(index / columns) * (frame.height + gap);
    const attendee = credential.attendee_id ? attendeeMap.get(credential.attendee_id) : null;
    const category = (attendee?.ticket_types as { name?: string } | null)?.name ?? "Event Pass";
    const values: Record<string, string> = {
      name: attendee?.name ?? "Guest", category, code: attendee?.attendee_code ?? credential.display_code ?? credential.id,
      event_name: event.name, event_date: event.dateLabel ?? "", venue: event.venue ?? "",
      cta: "Open pass", register: "Daftar", claim: "Klaim pass",
    };
    const pieces = template.elements.flatMap((element) => {
      if (element.field === "qr") return qr ? [qrSvgMarkup(`PF1:${credential.code}`, x + qr.x, y + qr.y, qr.width, qr.height, template.qrStyle.foreground, template.qrStyle.background, template.qrStyle.modules)] : [];
      if (element.field === "photo") {
        const photo = attendee ? photos.get(attendee.id) : null;
        return photo && attendee ? [`<rect x="${x + element.x}" y="${y + element.y}" width="${element.width}" height="${element.height}" fill="url(#passflow-photo-${xml(attendee.id)}-${xml(element.nodeId)})" clip-path="url(#passflow-photo-${xml(attendee.id)}-${xml(element.nodeId)}-clip)"/>`] : [];
      }
      const value = values[element.field];
      return value ? [renderText(element, value, x, y)] : [];
    }).join("");
    return `<g id="passflow-${xml(credential.display_code ?? credential.id)}"><rect x="${x}" y="${y}" width="${frame.width}" height="${frame.height}" fill="#fff"/>${background ? `<use href="#passflow-design-background" x="${x}" y="${y}" width="${frame.width}" height="${frame.height}"/>` : ""}${pieces}</g>`;
  }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${xml(design.name)} · ${xml(event.name)}</title><defs>${imageDefinitions}</defs>${cards.join("")}</svg>`;
  return new NextResponse(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "content-disposition": `attachment; filename="${safeFile(event.name)}-${safeFile(design.name)}-save-as.svg"`, "cache-control": "no-store" } });
}
