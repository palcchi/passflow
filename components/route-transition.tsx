"use client";

import type { ReactNode } from "react";
import {
  LayoutGroup,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const routeEase = [0.22, 1, 0.36, 1] as const;

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const controls = useAnimationControls();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (reduceMotion) {
      controls.set({ opacity: 1, y: 0, scale: 1 });
      return;
    }

    controls.set({ opacity: 0.965, y: 8, scale: 0.998 });
    void controls.start({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.28, ease: routeEase },
    });
  }, [pathname, reduceMotion, controls]);

  return (
    <LayoutGroup id="passflow-route-layout">
      <motion.div
        className="pf-route-stage"
        initial={false}
        animate={controls}
      >
        {children}
      </motion.div>
    </LayoutGroup>
  );
}
