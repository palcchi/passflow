"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

export function SmoothCursor() {
  const x = useMotionValue(-40);
  const y = useMotionValue(-40);
  const springX = useSpring(x, { stiffness: 560, damping: 38, mass: 0.25 });
  const springY = useSpring(y, { stiffness: 560, damping: 38, mass: 0.25 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine) and (min-width: 900px)");
    const sync = () => setEnabled(media.matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    sync();
    media.addEventListener("change", sync);

    const move = (event: PointerEvent) => {
      x.set(event.clientX - 7);
      y.set(event.clientY - 7);
    };
    window.addEventListener("pointermove", move, { passive: true });

    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("pointermove", move);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="smooth-cursor"
      style={{ x: springX, y: springY }}
    />
  );
}
