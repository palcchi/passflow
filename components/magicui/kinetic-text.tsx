"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type KineticTextProps = {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
};

export function KineticText({
  text,
  as: Tag = "h1",
  className,
}: KineticTextProps) {
  const [active, setActive] = useState<number | null>(null);
  const words = text.split(" ");
  let offset = 0;

  return (
    <Tag
      className={cn("kinetic-text", className)}
      aria-label={text}
      onPointerLeave={() => setActive(null)}
    >
      {words.map((word, wordIndex) => {
        const start = offset;
        offset += word.length;
        return (
          <span className="kinetic-word" key={`${word}-${wordIndex}`}>
            {Array.from(word).map((letter, letterIndex) => {
              const index = start + letterIndex;
              const distance = active === null ? 99 : Math.abs(active - index);
              const weight =
                distance === 0
                  ? 800
                  : distance === 1
                    ? 650
                    : distance === 2
                      ? 520
                      : 410;
              return (
                <span
                  key={`${letter}-${index}`}
                  aria-hidden="true"
                  className="kinetic-letter"
                  style={{ fontWeight: weight }}
                  onPointerEnter={() => setActive(index)}
                >
                  {letter}
                </span>
              );
            })}
            {wordIndex < words.length - 1 && (
              <span className="kinetic-space" aria-hidden="true"> </span>
            )}
          </span>
        );
      })}
    </Tag>
  );
}
