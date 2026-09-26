import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function ShineBorder({
  className,
  duration = 14,
  borderWidth = 1,
  shineColor = ["#f2c94c", "#c7d5ff", "#f0c2d7"],
}: {
  className?: string;
  duration?: number;
  borderWidth?: number;
  shineColor?: string | string[];
}) {
  const colors = Array.isArray(shineColor) ? shineColor.join(",") : shineColor;
  return (
    <span
      aria-hidden
      className={cn("magic-shine-border", className)}
      style={{
        "--shine-duration": `${duration}s`,
        "--shine-width": `${borderWidth}px`,
        "--shine-colors": colors,
      } as CSSProperties}
    />
  );
}
