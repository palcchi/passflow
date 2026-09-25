"use client";

// Adapted from Magic UI (MIT). See THIRD_PARTY_NOTICES.md.
import { useEffect, useRef } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";

export function BlurFade({ children, className, delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();
  const played = useRef(false);

  useEffect(() => {
    // Keep server HTML readable before hydration and with JavaScript disabled.
    if (reducedMotion === null) return;
    if (reducedMotion) {
      controls.stop();
      controls.set({ opacity: 1, y: 0, filter: "blur(0px)" });
      return;
    }
    if (played.current) return;
    played.current = true;
    controls.set({ opacity: 0, y: 6, filter: "blur(3px)" });
    void controls.start({ opacity: 1, y: 0, filter: "blur(0px)",
      transition: { duration: 0.3, delay, ease: "easeOut" } });
  }, [controls, reducedMotion, delay]);

  return <motion.div initial={false} animate={controls} className={className}>{children}</motion.div>;
}
