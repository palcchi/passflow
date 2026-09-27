"use client";

import type { ReactNode } from "react";
import { LayoutGroup, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const routeEase = "cubic-bezier(0.22, 1, 0.36, 1)";

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reduceMotion || "startViewTransition" in document) return;

    const stage = document.querySelector(".pf-route-stage");
    const target = stage?.querySelector(".flow-workspace > main, main");
    if (!(target instanceof HTMLElement)) return;

    target.animate(
      [
        { opacity: 0.94, transform: "translateY(12px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 280,
        easing: routeEase,
        fill: "both",
      },
    );
  }, [pathname, reduceMotion]);

  return (
    <LayoutGroup id="passflow-route-layout">
      <div className="pf-route-stage">{children}</div>
    </LayoutGroup>
  );
}
