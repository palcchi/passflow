"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type TextAnimateProps = {
  children: string;
  as?: "p" | "span" | "h1" | "h2" | "h3";
  by?: "word" | "character";
  className?: string;
  delay?: number;
  once?: boolean;
};

export function TextAnimate({
  children,
  as = "p",
  by = "word",
  className,
  delay = 0,
  once = true,
}: TextAnimateProps) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once, margin: "-8% 0px" });
  const reduceMotion = useReducedMotion();
  const segments = by === "character" ? Array.from(children) : children.split(" ");
  const MotionTag = motion.create(as);

  return (
    <MotionTag
      ref={ref}
      className={cn("text-animate", className)}
      aria-label={children}
    >
      {segments.map((segment, index) => (
        <motion.span
          key={`${segment}-${index}`}
          aria-hidden="true"
          className="text-animate-segment"
          initial={reduceMotion ? false : { opacity: 0, y: 12, filter: "blur(5px)" }}
          animate={
            reduceMotion || inView
              ? { opacity: 1, y: 0, filter: "blur(0px)" }
              : { opacity: 0, y: 12, filter: "blur(5px)" }
          }
          transition={{
            duration: reduceMotion ? 0 : 0.42,
            delay: reduceMotion ? 0 : delay + index * (by === "character" ? 0.018 : 0.045),
            ease: [0.22, 0.8, 0.3, 1],
          }}
        >
          {segment}
          {by === "word" && index < segments.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </MotionTag>
  );
}
