"use client";

import { MouseEvent, PropsWithChildren, useState } from "react";
import { cn } from "@/lib/utils";

const resting =
  "radial-gradient(circle at 18% 12%, rgba(242,201,76,.10), transparent 34%), radial-gradient(circle at 86% 82%, rgba(158,185,255,.08), transparent 36%), rgba(255,255,255,.76)";

export function MagicCard({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  const [style, setStyle] = useState({ background: resting });

  function move(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setStyle({
      background: `radial-gradient(circle at ${x}% ${y}%, rgba(242,201,76,.16), transparent 32%), radial-gradient(circle at ${100 - x}% ${100 - y}%, rgba(167,196,255,.10), transparent 34%), rgba(255,255,255,.78)`,
    });
  }

  return (
    <div
      onMouseMove={move}
      onMouseLeave={() => setStyle({ background: resting })}
      style={style}
      className={cn(
        "transition-[background,transform,box-shadow] duration-300",
        className,
      )}
    >
      {children}
    </div>
  );
}
