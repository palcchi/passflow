export const designKinds = [
  { value: "id_card", label: "ID card" }, { value: "wristband", label: "Wristband" },
  { value: "ticket", label: "Tiket" }, { value: "lanyard", label: "Lanyard" },
  { value: "event_cover", label: "Cover event" }, { value: "event_page", label: "Halaman event" },
  { value: "social", label: "Konten sosial" }, { value: "custom", label: "Lainnya" },
] as const;

export type FigmaBox = { x: number; y: number; width: number; height: number };
export type FigmaTemplate = {
  source: "figma"; unit: "px"; frame: FigmaBox; frameNodeId: string | null;
  qrPlaceholder: (FigmaBox & { nodeId: string; name: string }) | null;
  qrMarker: string; hasQr: boolean;
};
export const defaultTemplate: FigmaTemplate = {
  source: "figma", unit: "px", frame: { x: 0, y: 0, width: 1080, height: 1350 }, frameNodeId: null,
  qrPlaceholder: null, qrMarker: "PASSFLOW_QR", hasQr: false,
};
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const number = (v: unknown, fallback: number) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
function box(value: unknown, fallback: FigmaBox): FigmaBox { const v = record(value); return { x: number(v.x, fallback.x), y: number(v.y, fallback.y), width: Math.max(1, number(v.width, fallback.width)), height: Math.max(1, number(v.height, fallback.height)) }; }
export function readTemplate(value: unknown): FigmaTemplate {
  const v = record(value), frame = box(v.frame, defaultTemplate.frame), p = v.qrPlaceholder ? record(v.qrPlaceholder) : null;
  return { source: "figma", unit: "px", frame, frameNodeId: typeof v.frameNodeId === "string" ? v.frameNodeId : null,
    qrMarker: typeof v.qrMarker === "string" && v.qrMarker.trim() ? v.qrMarker.trim() : "PASSFLOW_QR", hasQr: v.hasQr === true,
    qrPlaceholder: p && typeof p.nodeId === "string" ? { ...box(p, { x: 0, y: 0, width: 160, height: 160 }), nodeId: p.nodeId, name: typeof p.name === "string" ? p.name : "PASSFLOW_QR" } : null };
}
export function xml(value: string) { return value.replace(/[<>&'\"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!)); }
