"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function TypingAnimation({
  children,
  className,
  duration = 38,
  delay = 150,
}: {
  children: string;
  className?: string;
  duration?: number;
  delay?: number;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(children);
      return;
    }

    let index = 0;
    let interval = 0;
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        index += 1;
        setValue(children.slice(0, index));
        if (index >= children.length) window.clearInterval(interval);
      }, duration);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [children, delay, duration]);

  return (
    <span ref={ref} className={cn("typing-animation", className)} aria-label={children}>
      <span aria-hidden="true">{value}</span>
      <span className="typing-caret" aria-hidden="true" />
    </span>
  );
}
