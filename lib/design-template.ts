export const designKinds = [
  { value: "id_card", label: "ID card" }, { value: "wristband", label: "Wristband" },
  { value: "ticket", label: "Tiket" }, { value: "lanyard", label: "Lanyard" },
  { value: "event_cover", label: "Cover event" }, { value: "event_page", label: "Halaman event" },
  { value: "social", label: "Konten sosial" }, { value: "custom", label: "Lainnya" },
] as const;

export const dynamicMarkers = {
  PASSFLOW_NAME: "name", PASSFLOW_PHOTO: "photo", PASSFLOW_CATEGORY: "category",
  PASSFLOW_QR: "qr", PASSFLOW_CODE: "code", PASSFLOW_EVENT_NAME: "event_name",
  PASSFLOW_EVENT_DATE: "event_date", PASSFLOW_VENUE: "venue", PASSFLOW_CTA: "cta",
  PASSFLOW_REGISTER: "register", PASSFLOW_CLAIM: "claim",
} as const;
export type DynamicMarker = keyof typeof dynamicMarkers;
export type DynamicField = (typeof dynamicMarkers)[DynamicMarker];
export type FigmaBox = { x: number; y: number; width: number; height: number };
export type FigmaElement = FigmaBox & {
  nodeId: string;
  name: string;
  marker: DynamicMarker;
  field: DynamicField;
  nodeType: string;
  fill: string | null;
  fontSize: number | null;
  fontColor: string | null;
  fontFamily: string | null;
  fontWeight: number | null;
  textAlign: string | null;
  cornerRadius: number | null;
};
export type FigmaTemplate = {
  source: "figma"; unit: "px"; frame: FigmaBox; frameNodeId: string | null;
  elements: FigmaElement[];
  qrPlaceholder: (FigmaBox & { nodeId: string; name: string }) | null;
  qrMarker: string; hasQr: boolean;
  qrStyle: { foreground: string; background: string; modules: "square" | "rounded" | "dots" };
};
export const defaultTemplate: FigmaTemplate = {
  source: "figma", unit: "px", frame: { x: 0, y: 0, width: 1080, height: 1350 }, frameNodeId: null,
  elements: [], qrPlaceholder: null, qrMarker: "PASSFLOW_QR", hasQr: false,
  qrStyle: { foreground: "#111111", background: "#ffffff", modules: "square" },
};
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const number = (v: unknown, fallback: number) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
const color = (v: unknown, fallback: string) => typeof v === "string" && /^#[\da-f]{6}$/i.test(v) ? v : fallback;
function box(value: unknown, fallback: FigmaBox): FigmaBox {
  const v = record(value);
  return { x: number(v.x, fallback.x), y: number(v.y, fallback.y), width: Math.max(1, number(v.width, fallback.width)), height: Math.max(1, number(v.height, fallback.height)) };
}
export function readTemplate(value: unknown): FigmaTemplate {
  const v = record(value), frame = box(v.frame, defaultTemplate.frame), p = v.qrPlaceholder ? record(v.qrPlaceholder) : null;
  const qr = record(v.qrStyle);
  const elements = Array.isArray(v.elements) ? v.elements.slice(0, 60).flatMap((raw) => {
    const e = record(raw), marker = e.marker as DynamicMarker;
    if (!Object.hasOwn(dynamicMarkers, marker) || typeof e.nodeId !== "string") return [];
    const b = box(e, { x: 0, y: 0, width: 1, height: 1 });
    return [{ ...b, nodeId: e.nodeId, name: typeof e.name === "string" ? e.name.slice(0, 120) : marker,
      marker, field: dynamicMarkers[marker], nodeType: typeof e.nodeType === "string" ? e.nodeType : "UNKNOWN",
      fill: color(e.fill, "#ffffff"), fontSize: e.fontSize === null ? null : Math.max(1, number(e.fontSize, 16)),
      fontColor: color(e.fontColor, "#111111"), fontFamily: typeof e.fontFamily === "string" ? e.fontFamily.slice(0, 80) : null,
      fontWeight: e.fontWeight === null ? null : Math.max(100, Math.min(900, number(e.fontWeight, 400))),
      textAlign: typeof e.textAlign === "string" ? e.textAlign : null,
      cornerRadius: e.cornerRadius === null ? null : Math.max(0, number(e.cornerRadius, 0)) }];
  }) : [];
  const qrPlaceholder = p && typeof p.nodeId === "string" ? { ...box(p, { x: 0, y: 0, width: 160, height: 160 }), nodeId: p.nodeId, name: typeof p.name === "string" ? p.name : "PASSFLOW_QR" } : null;
  return { source: "figma", unit: "px", frame, frameNodeId: typeof v.frameNodeId === "string" ? v.frameNodeId : null,
    elements, qrMarker: typeof v.qrMarker === "string" && v.qrMarker.trim() ? v.qrMarker.trim() : "PASSFLOW_QR",
    hasQr: v.hasQr === true || elements.some((e) => e.field === "qr"), qrPlaceholder,
    qrStyle: { foreground: color(qr.foreground, "#111111"), background: color(qr.background, "#ffffff"), modules: ["square", "rounded", "dots"].includes(String(qr.modules)) ? qr.modules as "square" | "rounded" | "dots" : "square" } };
}
export function xml(value: string) { return value.replace(/[<>&'\"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!)); }
