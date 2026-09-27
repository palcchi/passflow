import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { FlowPass, FlowShapes } from "@/components/flow-art";

export { Sticker } from "@/components/brand-art";

export function FolderArtwork({ color = "lavender", label = "Good moments", className = "" }: {
  color?: "lavender" | "orange" | "blue" | "lime";
  label?: string;
  className?: string;
}) {
  return <div className={`flow-object flow-object-${color} ${className}`} aria-hidden="true"><FlowShapes/><span>{label}<ArrowUpRight size={14}/></span></div>;
}

export function CollectionArtwork({ compact = false }: { compact?: boolean }) {
  return <FlowPass compact={compact}/>;
}

export function EventCoverArtwork({ name, color }: { name: string; color: string }) {
  return <div className="event-cover-art" style={{ "--cover-accent": color } as CSSProperties} aria-hidden="true">
    <FlowShapes color={color}/>
    <span className="cover-index">PASSFLOW / UPCOMING MOMENTS</span>
    <div className="flow-cover-title">{name}</div>
    <span className="cover-corner">See you there. ↗</span>
  </div>;
}
