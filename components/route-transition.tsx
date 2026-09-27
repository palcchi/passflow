"use client";

import type { ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";

const routeEase = [0.22, 1, 0.36, 1] as const;

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <LayoutGroup id="passflow-route-layout">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={pathname}
          className="pf-route-stage"
          initial={reduceMotion ? false : { opacity: 0.985, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0.985, y: -4 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: routeEase }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </LayoutGroup>
  );
}
