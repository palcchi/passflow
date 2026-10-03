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

