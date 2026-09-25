"use client";
import { MouseEvent, PropsWithChildren, useState } from "react";
import { cn } from "@/lib/utils";
export function MagicCard({ children, className }: PropsWithChildren<{ className?: string }>) {
  const [style, setStyle] = useState({ background: "radial-gradient(circle at 50% 50%, rgba(116,72,255,.10), transparent 35%)" });
  function move(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setStyle({ background: `radial-gradient(circle at ${x}% ${y}%, rgba(116,72,255,.16), transparent 38%)` });
  }
  return <div onMouseMove={move} onMouseLeave={() => setStyle({ background: "radial-gradient(circle at 50% 50%, rgba(116,72,255,.10), transparent 35%)" })} style={style} className={cn("transition-[background] duration-300", className)}>{children}</div>;
}
