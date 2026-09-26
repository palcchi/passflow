"use client";

import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  className,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  fromRef: React.RefObject<HTMLElement | null>;
  toRef: React.RefObject<HTMLElement | null>;
  className?: string;
}) {
  const [from, setFrom] = useState<Point>({ x: 0, y: 0 });
  const [to, setTo] = useState<Point>({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 1, height: 1 });
  const reduceMotion = useReducedMotion();
  const id = useId().replaceAll(":", "");

  useEffect(() => {
    const update = () => {
      const container = containerRef.current?.getBoundingClientRect();
      const start = fromRef.current?.getBoundingClientRect();
      const end = toRef.current?.getBoundingClientRect();
      if (!container || !start || !end) return;
      setSize({
        width: Math.max(1, container.width),
        height: Math.max(1, container.height),
      });
      setFrom({
        x: start.left - container.left + start.width / 2,
        y: start.top - container.top + start.height / 2,
      });
      setTo({
        x: end.left - container.left + end.width / 2,
        y: end.top - container.top + end.height / 2,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef, fromRef, toRef]);

  const midX = (from.x + to.x) / 2;
  const path =
    "M " +
    from.x +
    " " +
    from.y +
    " C " +
    midX +
    " " +
    from.y +
    ", " +
    midX +
    " " +
    to.y +
    ", " +
    to.x +
    " " +
    to.y;

  return (
    <svg
      className={cn("animated-beam-svg", className)}
      aria-hidden="true"
      width="100%"
      height="100%"
      viewBox={"0 0 " + size.width + " " + size.height}
      preserveAspectRatio="none"
    >
      <path d={path} className="animated-beam-path" />
      <motion.path
        d={path}
        className="animated-beam-runner"
        stroke={"url(#beam-" + id + ")"}
        initial={{ pathLength: 0.08, pathOffset: -0.12 }}
        animate={
          reduceMotion
            ? { pathLength: 0.25, pathOffset: 0 }
            : { pathLength: 0.16, pathOffset: [0, 1] }
        }
        transition={{
          duration: reduceMotion ? 0 : 2.8,
          ease: "linear",
          repeat: reduceMotion ? 0 : Infinity,
        }}
      />
      <defs>
        <linearGradient id={"beam-" + id} x1="0" x2="1">
          <stop offset="0%" stopColor="var(--event-admin-accent, var(--ink))" stopOpacity="0" />
          <stop offset="48%" stopColor="var(--event-admin-accent, var(--ink))" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--event-admin-secondary, var(--muted-text))" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
