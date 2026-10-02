"use client";

import type { ReactNode } from "react";
import { LayoutGroup, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Keep the layout tree mounted so navigation retains editor and scanner state.
// Active navigation pills still animate within the shared layout group.
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reduceMotion || "startViewTransition" in document) return;

    const stage = stageRef.current;
    const target =
      stage?.querySelector<HTMLElement>(".event-admin-page-content") ??
      stage?.querySelector<HTMLElement>("main");

    target?.animate(
      [
        { opacity: 0.92, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        // Do not keep the transform after the animation: a lingering transform
        // turns <main> into the containing block for position: fixed children.
        fill: "backwards",
      },
    );
  }, [pathname, reduceMotion]);

  return (
    <LayoutGroup id="passflow-route-layout">
      <div ref={stageRef} className="pf-route-stage">
        {children}
      </div>
    </LayoutGroup>
  );
}
