"use client";

// Adapted from Magic UI (MIT). See THIRD_PARTY_NOTICES.md.
import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function NumberTicker({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reducedMotion = useReducedMotion();
  const formatted = new Intl.NumberFormat("id-ID").format(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.textContent = formatted;
    if (!inView || reducedMotion !== false) return;
    const formatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
    const animation = animate(0, value, {
      duration: 0.65,
      ease: "easeOut",
      onUpdate: (latest) => { node.textContent = formatter.format(latest); },
      onComplete: () => { node.textContent = formatted; },
    });
    return () => { animation.stop(); node.textContent = formatted; };
  }, [value, formatted, inView, reducedMotion]);

  return <span className={cn("tabular-nums", className)}>
    <span className="sr-only">{formatted}</span>
    <span ref={ref} aria-hidden="true">{formatted}</span>
  </span>;
}
