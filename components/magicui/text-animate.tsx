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
          initial={{ opacity: 0, y: 12, filter: "blur(5px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once, amount: 0.4 }}
          transition={{
            duration: 0.42,
            delay: delay + index * (by === "character" ? 0.018 : 0.045),
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
