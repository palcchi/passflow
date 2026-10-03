import { ArrowUpRight, Asterisk, Check, MoveUpRight, Sparkles } from "lucide-react";

/** Lightweight, decorative artwork. No images, network requests, or layout shift. */
export function Sticker({ kind = "spark", className = "" }: {
  kind?: "spark" | "smile" | "arrow" | "check";
  className?: string;
}) {
  return <span className={`brand-sticker sticker-${kind} ${className}`} aria-hidden="true">
    {kind === "spark" ? <Asterisk strokeWidth={1.6} /> : kind === "arrow" ? <MoveUpRight strokeWidth={1.5} /> : kind === "check" ? <Check strokeWidth={2} /> : <svg viewBox="0 0 64 64" fill="none"><circle cx="23" cy="25" r="2.8" fill="currentColor"/><circle cx="41" cy="25" r="2.8" fill="currentColor"/><path d="M19 37c5 12 21 12 26 0" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/></svg>}
  </span>;
}

export function FolderArtwork({ color = "lavender", label = "Good moments", className = "" }: {
  color?: "lavender" | "orange" | "blue" | "lime";
  label?: string;
  className?: string;
}) {
  return <div className={`art-folder folder-${color} ${className}`} aria-hidden="true">
    <div className="folder-back" />
    <div className="folder-paper"><span/><span/><span/></div>
    <div className="folder-front"><span className="folder-label">{label}</span><ArrowUpRight size={25}/></div>
  </div>;
}

export function TicketArtwork({ className = "", label = "ALL ACCESS" }: { className?: string; label?: string }) {
  return <div className={`art-ticket ${className}`} aria-hidden="true">
    <div className="ticket-top"><span>PassFlow®</span><Sparkles size={16}/></div>
    <strong>Let’s make<br/>a moment.</strong>
    <div className="ticket-bottom"><span>{label}</span><i className="ticket-barcode"/></div>
  </div>;
}

export function CollectionArtwork({ compact = false }: { compact?: boolean }) {
  return <div className={`collection-art ${compact ? "collection-compact" : ""}`} aria-hidden="true">
    <FolderArtwork color="blue" label="Your people" className="collection-left"/>
    <FolderArtwork color="orange" label="Something good" className="collection-right"/>
    <TicketArtwork className="collection-ticket"/>
    <FolderArtwork color="lavender" label="See you there!" className="collection-center"/>
    <Sticker kind="smile" className="collection-smile"/>
    <Sticker kind="spark" className="collection-spark"/>
  </div>;
}

