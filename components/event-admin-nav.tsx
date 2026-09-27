"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const items = [
  { key: "overview", label: "Overview", suffix: "" },
  { key: "people", label: "People", suffix: "/people" },
  { key: "access", label: "Access", suffix: "/access" },
  { key: "experience", label: "Experience", suffix: "/experience" },
  { key: "appearance", label: "Appearance", suffix: "/appearance" },
  { key: "design", label: "Design", suffix: "/design" },
  { key: "settings", label: "Settings", suffix: "/settings" },
] as const;

export function EventAdminNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const base = `/admin/events/${eventId}`;

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav className="event-section-dock" aria-label="Event management">
      <div className="event-section-dock-scroll">
        {items.map(({ key, label, suffix }) => {
          const href = base + suffix;
          const routeIsActive = suffix
            ? pathname === href || pathname.startsWith(href + "/")
            : pathname === base;
          const active = pendingHref ? pendingHref === href : routeIsActive;
          return (
            <Link
              key={key}
              href={href}
              prefetch={true}
              className="event-dock-item"
              data-active={active}
              aria-current={active ? "page" : undefined}
              onClick={() => setPendingHref(href)}
            >
              {active && (
                <motion.span
                  className="event-nav-active-pill"
                  layoutId={`passflow-event-nav-pill-${eventId}`}
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 38, mass: 0.7 }}
                />
              )}
              <span className="event-dock-label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
