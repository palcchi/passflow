import type { PassFlowEvent } from "@/lib/events";
import { eventInk } from "@/lib/event-colors";

// Deterministic per-event artwork: same event, same picture; different events look different.
function seeded(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
}

export function EventArtwork({ event }: { event: Pick<PassFlowEvent, "id" | "theme"> }) {
  const r = seeded(event.id);
  const { primary, secondary } = event.theme;
  const ink = eventInk(primary);
  const style = Math.floor(r() * 4);
  const rot = Math.round(r() * 60 - 30);
  const shapes = Array.from({ length: 7 }, (_, i) => ({ x: r() * 400, y: r() * 225, s: 30 + r() * 110, i }));

  return <svg className="event-artwork" viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="400" height="225" fill={primary} />
    <g transform={`rotate(${rot} 200 112)`}>
      {style === 0 && shapes.map(({ x, y, s, i }) => <circle key={i} cx={x} cy={y} r={s / 2} fill={i % 2 ? secondary : ink} opacity={i % 2 ? 0.9 : 0.14} />)}
      {style === 1 && shapes.map(({ x, y, s, i }) => <rect key={i} x={x - s / 2} y={y - s / 3} width={s} height={s / 1.5} rx={s / 4} fill={i % 3 ? secondary : ink} opacity={i % 3 ? 0.85 : 0.16} />)}
      {style === 2 && Array.from({ length: 9 }, (_, i) => <rect key={i} x={-100 + i * 70} y={-120} width={22 + (i % 3) * 14} height={480} fill={i % 2 ? secondary : ink} opacity={i % 2 ? 0.8 : 0.12} />)}
      {style === 3 && shapes.slice(0, 5).map(({ x, y, s, i }) => <circle key={i} cx={x} cy={y} r={s} fill="none" stroke={i % 2 ? secondary : ink} strokeWidth={10 + (i % 3) * 8} opacity={i % 2 ? 0.9 : 0.18} />)}
    </g>
  </svg>;
}
