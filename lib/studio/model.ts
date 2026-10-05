export const studioKinds = ['website', 'digital', 'id_card', 'wristband'] as const;
export type StudioKind = typeof studioKinds[number];
export type Layer = { id: string; type: 'text' | 'image' | 'qr' | 'shape'; field: string; text: string; src: string; x: number; y: number; width: number; height: number; fontSize: number; color: string; fill: string; radius: number; align: 'left' | 'center' | 'right'; locked: boolean; hidden: boolean };
export type Section = { id: string; type: 'hero' | 'description' | 'schedule' | 'location' | 'gallery' | 'faq' | 'registration'; title: string; body: string; image: string; hidden: boolean };
export type StudioDocument = { schema: 1; width: number; height: number; background: string; foreground: string; accent: string; font: 'sans' | 'serif' | 'mono'; layers: Layer[]; sections: Section[] };
// Pass size is the designer's call in Figma; the bounds only stop absurd print jobs (2 m covers banners and lanyards).
export const MIN_MM = 10, MAX_MM = 2000;
export const fields = ['text','name','category','code','event_name','event_date','venue','photo','logo'] as const;
export const safeImage = (value: unknown): string => typeof value === 'string' && value.length < 500000 && (/^https:\/\/[^\s]+$/i.test(value) || /^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(value)) ? value : '';
const color = (v: unknown, fallback: string) => typeof v === 'string' && /^#[\da-f]{6}$/i.test(v) ? v : fallback;
const num = (v: unknown, min: number, max: number, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
const str = (v: unknown, max = 2000) => typeof v === 'string' ? v.slice(0, max) : '';
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export function newLayer(type: Layer['type'], id = crypto.randomUUID()): Layer {
  return { id, type, field: type === 'text' ? 'name' : 'text', text: 'Your text', src: '', x: 5, y: 5, width: type === 'qr' ? 20 : 40, height: type === 'qr' ? 20 : 10, fontSize: 4, color: '#171717', fill: '#ffffff', radius: 0, align: 'left', locked: false, hidden: false };
}
export function defaultDocument(kind: StudioKind): StudioDocument {
  const band = kind === 'wristband';
  return { schema: 1, width: band ? 240 : 54, height: band ? 25 : 85.6, background: '#ffffff', foreground: '#171717', accent: '#635bff', font: 'sans',
    layers: [ { ...newLayer('text','event'), field: 'event_name', x: band ? 25 : 5, y: 5, width: band ? 130 : 44, height: 12, fontSize: 4 }, { ...newLayer('text','name'), x: band ? 25 : 5, y: band ? 16 : 22, width: band ? 130 : 44, height: 8, fontSize: 4.5 }, { ...newLayer('qr','qr'), x: band ? 195 : 12, y: band ? 3.5 : 43, width: band ? 18 : 30, height: band ? 18 : 30 } ],
    sections: [ { id: 'hero', type: 'hero', title: '', body: '', image: '', hidden: false }, { id: 'description', type: 'description', title: 'About the event', body: '', image: '', hidden: false }, { id: 'location', type: 'location', title: 'When & where', body: '', image: '', hidden: false }, { id: 'registration', type: 'registration', title: 'Be part of it', body: 'Reserve your place and receive your event pass.', image: '', hidden: false } ] };
}
export function readStudioDocument(value: unknown): StudioDocument | null {
  const v = obj(value); if (v.schema !== 1 || !Array.isArray(v.layers) || !Array.isArray(v.sections)) return null;
  const ids = new Set<string>();
  const layers = v.layers.slice(0,60).flatMap(raw => { const l = obj(raw); const id = str(l.id,80); if (!id || ids.has(id) || !['text','image','qr','shape'].includes(String(l.type))) return []; ids.add(id);
    return [{ id, type: l.type as Layer['type'], field: fields.includes(l.field as typeof fields[number]) ? String(l.field) : 'text', text: str(l.text), src: safeImage(l.src), x: num(l.x,0,MAX_MM,0), y: num(l.y,0,MAX_MM,0), width: num(l.width,1,MAX_MM,20), height: num(l.height,1,MAX_MM,20), fontSize: num(l.fontSize,1,200,4), color: color(l.color,'#171717'), fill: color(l.fill,'#ffffff'), radius: num(l.radius,0,100,0), align: ['left','center','right'].includes(String(l.align)) ? l.align as Layer['align'] : 'left', locked: l.locked === true, hidden: l.hidden === true }]; });
  const sections = v.sections.slice(0,30).flatMap((raw,index) => { const s = obj(raw); if (!['hero','description','schedule','location','gallery','faq','registration'].includes(String(s.type))) return []; return [{ id: `section-${index}`, type: s.type as Section['type'], title: str(s.title,200), body: str(s.body,10000), image: safeImage(s.image), hidden: s.hidden === true }]; });
  return { schema: 1, width: num(v.width,MIN_MM,MAX_MM,54), height: num(v.height,MIN_MM,MAX_MM,85.6), background: color(v.background,'#ffffff'), foreground: color(v.foreground,'#171717'), accent: color(v.accent,'#635bff'), font: ['sans','serif','mono'].includes(String(v.font)) ? v.font as StudioDocument['font'] : 'sans', layers, sections };
}
export function validateStudio(doc: StudioDocument, kind: StudioKind): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(doc.width) || !Number.isFinite(doc.height) || doc.width < MIN_MM || doc.width > MAX_MM || doc.height < MIN_MM || doc.height > MAX_MM) errors.push(`Dimensions must be between ${MIN_MM} and ${MAX_MM} mm.`);
  if (kind === 'website') {
    if (!doc.sections.some(s => !s.hidden && s.type === 'registration')) errors.push('Add a visible registration section so attendees can register.');
    return errors;
  }
  const visible = doc.layers.filter(l => !l.hidden);
  if (visible.filter(l => l.type === 'qr').length !== 1) errors.push('Include exactly one visible QR code.');
  for (const l of visible) {
    if (l.width < 1 || l.height < 1 || l.x < 0 || l.y < 0) errors.push("Layer dimensions must be positive and positions inside the canvas.");
    if (l.x + l.width > doc.width + .01 || l.y + l.height > doc.height + .01) errors.push(`${l.field === 'text' ? l.type : l.field} extends beyond the print boundary.`);
    if (l.type === 'qr' && (Math.abs(l.width-l.height)>.01 || l.width < 15)) errors.push('QR must be square and at least 15 mm wide, including its quiet zone.');
    if (l.type === 'qr' && visible.some(other => other.id !== l.id && (other.type !== 'shape' || doc.layers.indexOf(other) > doc.layers.indexOf(l)) && !(other.type === 'image' && doc.layers.indexOf(other) === 0 && other.x === 0 && other.y === 0 && other.width === doc.width && other.height === doc.height) && other.x < l.x+l.width && other.x+other.width > l.x && other.y < l.y+l.height && other.y+other.height > l.y)) errors.push('Keep text and images clear of the QR code.');
    if (l.type === 'image' && !l.src && !['photo','logo'].includes(l.field)) errors.push('Choose an image for each image layer.');
  }
  return [...new Set(errors)];
}
export const studioFont = (font: StudioDocument['font']) => font === 'serif' ? 'Georgia, serif' : font === 'mono' ? 'monospace' : 'Arial, sans-serif';
