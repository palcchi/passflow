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
      controls.set({ x: 0 });
      return;
    }

    controls.set({ x: 12 });
    void controls.start({
      x: 0,
      transition: { duration: 0.26, ease: routeEase },
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
