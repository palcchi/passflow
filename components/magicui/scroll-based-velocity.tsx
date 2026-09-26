"use client";

import { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

function wrap(min: number, max: number, value: number) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

export function VelocityScroll({
  children,
  className,
  defaultVelocity = 0.7,
}: {
  children: string;
  className?: string;
  defaultVelocity?: number;
}) {
  const baseX = useMotionValue(0);
  const direction = useRef(1);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 300,
  });
  const velocityFactor = useTransform(smoothVelocity, [-1000, 0, 1000], [-2, 0, 2], {
    clamp: false,
  });
  const x = useTransform(baseX, (value) => `${wrap(-25, 0, value)}%`);
  const reduceMotion = useReducedMotion();

  useAnimationFrame((_, delta) => {
    if (reduceMotion) return;
    let moveBy = direction.current * defaultVelocity * (delta / 1000);
    const factor = velocityFactor.get();
    if (factor < 0) direction.current = -1;
    if (factor > 0) direction.current = 1;
    moveBy += direction.current * moveBy * Math.abs(factor);
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className={cn("velocity-scroll", className)}>
      <motion.div className="velocity-scroll-track" style={{ x }}>
        {Array.from({ length: 8 }).map((_, index) => (
          <span key={index}>{children}</span>
        ))}
      </motion.div>
    </div>
  );
}
