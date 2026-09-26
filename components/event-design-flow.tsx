"use client";

import { useRef } from "react";
import { AnimatedBeam } from "@/components/magicui/animated-beam";

export function EventDesignFlow() {
  const container = useRef<HTMLDivElement>(null);
  const figma = useRef<HTMLDivElement>(null);
  const passflow = useRef<HTMLDivElement>(null);
  const output = useRef<HTMLDivElement>(null);

  return (
    <div ref={container} className="design-beam-flow">
      <div ref={figma} className="design-beam-node">
        <strong>Figma</strong>
        <span>Frame + markers</span>
      </div>
      <div ref={passflow} className="design-beam-node is-core">
        <strong>PassFlow</strong>
        <span>Live attendee data</span>
      </div>
      <div ref={output} className="design-beam-node">
        <strong>Pass output</strong>
        <span>ID card + QR</span>
      </div>
      <AnimatedBeam containerRef={container} fromRef={figma} toRef={passflow} />
      <AnimatedBeam containerRef={container} fromRef={passflow} toRef={output} />
    </div>
  );
}
