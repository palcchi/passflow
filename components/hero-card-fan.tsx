import type { CSSProperties } from "react";
import type { PassFlowEvent } from "@/lib/events";

// Shown when there are fewer published events with artwork than fan slots.
const sampleCards = [
  { bg: "#e9573f", fg: "#fff", title: "Live\nmusic", meta: "FRI · 19:00" },
  { bg: "#dce6ff", fg: "#1f3b8f", title: "Design\nweek", meta: "HALL B" },
  { bg: "#ffd23f", fg: "#1b1b18", title: "Admit\none.", meta: "VIP" },
  { bg: "#f6b8c9", fg: "#5a1530", title: "Run\nclub", meta: "SUN · 06:00" },
  { bg: "#1b1b18", fg: "#fff", title: "Tech\ntalks", meta: "GATE A" },
  { bg: "#4a7cf7", fg: "#fff", title: "Film\nnight", meta: "ROW 6" },
  { bg: "#2f9e6b", fg: "#fff", title: "Food\nfest", meta: "ALL DAY" },
];

export function HeroCardFan({ events }: { events: PassFlowEvent[] }) {
  const images = events.flatMap((event) => {
    const image = event.posterUrl ?? event.heroImageUrl;
    return image ? [{ image, name: event.name }] : [];
  });
  const cards = sampleCards.map((card, index) => ({ ...card, ...images[index] }));
  const middle = (cards.length - 1) / 2;

  return <div className="hero-fan" aria-hidden="true">
    {cards.map((card, index) => {
      const offset = index - middle;
      return <div
        key={index}
        className="hero-fan-card"
        style={{ "--o": offset, "--a": Math.abs(offset), "--d": `${Math.abs(offset) * 60}ms`, background: card.bg, color: card.fg, zIndex: index } as CSSProperties}
      >
        {"image" in card && card.image
          ? <>
              {/* eslint-disable-next-line @next/next/no-img-element -- organizer-hosted artwork */}
              <img src={card.image} alt="" loading="lazy" />
              <span className="hero-fan-caption">{card.name}</span>
            </>
          : <>
              <span className="hero-fan-meta"><b>PassFlow</b>{card.meta}</span>
              <strong>{card.title}</strong>
              <span className="hero-fan-barcode" />
            </>}
      </div>;
    })}
    <span className="hero-fan-chip hero-fan-chip-left">✓ checked in</span>
    <span className="hero-fan-chip hero-fan-chip-right">@you · 1 pass</span>
  </div>;
}
