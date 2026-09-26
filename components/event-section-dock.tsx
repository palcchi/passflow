"use client";

import {
  Activity,
  BarChart3,
  QrCode,
  Settings2,
  Ticket,
  Users,
  Workflow,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const items = [
  { id: "overview", label: "Overview", icon: Settings2 },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "attendees", label: "Attendees", icon: Users },
  { id: "wristbands", label: "Wristbands", icon: QrCode },
  { id: "access", label: "Access", icon: Workflow },
  { id: "activities", label: "Activities", icon: Activity },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export function EventSectionDock() {
  const [active, setActive] = useState("overview");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-22% 0px -62% 0px", threshold: [0.05, 0.2, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="event-section-dock liquid-nav" aria-label="Navigasi event">
      <div className="event-section-dock-scroll">
        {items.map(({ id, label, icon: Icon }) => (
          <motion.a
            key={id}
            href={`#${id}`}
            className="event-dock-item"
            data-active={active === id}
            whileHover={reduceMotion ? undefined : { y: -2, scale: 1.025 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            onClick={() => setActive(id)}
          >
            <span className="event-dock-icon"><Icon size={15} /></span>
            <span>{label}</span>
          </motion.a>
        ))}
      </div>
    </nav>
  );
}
