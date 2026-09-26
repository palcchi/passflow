import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function BorderBeam({
  className,
  duration = 8,
  size = 90,
  delay = 0,
}: {
  className?: string;
  duration?: number;
  size?: number;
  delay?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn("magic-border-beam", className)}
      style={{
        "--beam-duration": `${duration}s`,
        "--beam-size": `${size}px`,
        "--beam-delay": `${delay}s`,
      } as CSSProperties}
    />
  );
}
