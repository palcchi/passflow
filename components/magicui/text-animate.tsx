"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const motionTags = {
  p: motion.p,
  span: motion.span,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
} as const;

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
  const segments = by === "character" ? Array.from(children) : children.split(" ");
  const MotionTag = motionTags[as];

  return (
    <MotionTag
      className={cn("text-animate", className)}
      aria-label={children}
    >
      {segments.map((segment, index) => (
        <motion.span
          key={`${segment}-${index}`}
          aria-hidden="true"
          className="text-animate-segment"
          // Dashboard headers are seen many times a day: a short fade, no travel or blur.
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once, amount: 0.4 }}
          transition={{
            duration: 0.2,
            delay: delay + index * (by === "character" ? 0.012 : 0.03),
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          {segment}
          {by === "word" && index < segments.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </MotionTag>
  );
}
