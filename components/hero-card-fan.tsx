import type { CSSProperties } from "react";
import type { PassFlowEvent } from "@/lib/events";
import { EventArtwork } from "@/components/event-artwork";

// Fill slots on the marketing hero when there are fewer real events than cards.
const sampleCards = [
  { bg: "#e9573f", fg: "#fff", title: "Live\nmusic", meta: "FRI · 19:00" },
  { bg: "#dce6ff", fg: "#1f3b8f", title: "Design\nweek", meta: "HALL B" },
  { bg: "#ffd23f", fg: "#1b1b18", title: "Admit\none.", meta: "VIP" },
  { bg: "#f6b8c9", fg: "#5a1530", title: "Run\nclub", meta: "SUN · 06:00" },
  { bg: "#1b1b18", fg: "#fff", title: "Tech\ntalks", meta: "GATE A" },
  { bg: "#4a7cf7", fg: "#fff", title: "Film\nnight", meta: "ROW 6" },
  { bg: "#2f9e6b", fg: "#fff", title: "Food\nfest", meta: "ALL DAY" },
];

/** Real events show their image or generated artwork (no text); compact = dashboard heroes, events only. */
export function HeroCardFan({ events, compact = false }: { events: PassFlowEvent[]; compact?: boolean }) {
  const real = events.slice(0, compact ? 5 : 7);
  const fill = compact && real.length ? [] : sampleCards.slice(real.length, compact ? 5 : 7);
  const total = real.length + fill.length;
  const middle = (total - 1) / 2;
  const slot = (index: number, extra?: CSSProperties) => {
    const offset = index - middle;
    return { "--o": offset, "--a": Math.abs(offset), "--d": `${Math.abs(offset) * 60}ms`, zIndex: index, ...extra } as CSSProperties;
  };

  return <div className={compact ? "hero-fan is-compact" : "hero-fan"} aria-hidden="true">
    {real.map((event, index) => {
      const image = event.posterUrl ?? event.heroImageUrl;
      return <div key={event.id} className="hero-fan-card is-event" style={slot(index)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- organizer-hosted artwork */}
        {image ? <img src={image} alt="" loading="lazy" /> : <EventArtwork event={event} />}
      </div>;
    })}
    {fill.map((card, i) => <div key={card.title} className="hero-fan-card" style={slot(real.length + i, { background: card.bg, color: card.fg })}>
      <span className="hero-fan-meta"><b>PassFlow</b>{card.meta}</span>
      <strong>{card.title}</strong>
      <span className="hero-fan-barcode" />
    </div>)}
    {!compact && <>
      <span className="hero-fan-chip hero-fan-chip-left">✓ checked in</span>
      <span className="hero-fan-chip hero-fan-chip-right">@you · 1 pass</span>
    </>}
  </div>;
}
