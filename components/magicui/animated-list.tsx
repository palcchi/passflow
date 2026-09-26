"use client";

import { Children } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function AnimatedList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={cn("animated-list", className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduceMotion ? 0 : 0.055 } },
      }}
    >
      {Children.map(children, (child) => (
        <motion.div
          variants={{
            hidden: reduceMotion ? {} : { opacity: 0, y: 7 },
            show: { opacity: 1, y: 0 },
          }}
          transition={{ duration: reduceMotion ? 0 : 0.28 }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
