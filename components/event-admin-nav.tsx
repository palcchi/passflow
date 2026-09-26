"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Workflow, Sparkles, Settings2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const items = [
  { key: "overview", label: "Overview", suffix: "", icon: LayoutDashboard },
  { key: "people", label: "People", suffix: "/people", icon: Users },
  { key: "access", label: "Access", suffix: "/access", icon: Workflow },
  { key: "experience", label: "Experience", suffix: "/experience", icon: Sparkles },
  { key: "settings", label: "Settings", suffix: "/settings", icon: Settings2 },
] as const;

export function EventAdminNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const base = `/admin/events/${eventId}`;

  return (
    <nav className="event-section-dock liquid-nav" aria-label="Event management">
      <div className="event-section-dock-scroll">
        {items.map(({ key, label, suffix, icon: Icon }) => {
          const href = base + suffix;
          const active = suffix ? pathname === href || pathname.startsWith(href + "/") : pathname === base;
          return (
            <motion.div
              key={key}
              whileHover={reduceMotion ? undefined : { y: -2, scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              <Link href={href} className="event-dock-item" data-active={active}>
                <span className="event-dock-icon"><Icon size={15} /></span>
                <span>{label}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </nav>
  );
}
