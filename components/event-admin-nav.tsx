"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

const items = [
  { key: "overview", label: "Overview", suffix: "" },
  { key: "people", label: "People", suffix: "/people" },
  { key: "access", label: "Access", suffix: "/access" },
  { key: "experience", label: "Experience", suffix: "/experience" },
  { key: "customize", label: "Customize", suffix: "/appearance" },
  { key: "design", label: "Design", suffix: "/design" },
  { key: "settings", label: "Settings", suffix: "/settings" },
] as const;

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function EventAdminNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const base = `/admin/events/${eventId}`;

  const [previousPath, setPreviousPath] = useState(pathname);
  if (previousPath !== pathname) {
    setPreviousPath(pathname);
    setPendingHref(null);
  }

  const activeHref =
    pendingHref ??
    items
      .map(({ suffix }) => base + suffix)
      .find((href) =>
        href === base
          ? pathname === base
          : pathname === href || pathname.startsWith(href + "/"),
      ) ??
    null;

  // Keep the active tab visible when the dock scrolls horizontally on phones.
  useEffect(() => {
    const container = scrollRef.current;
    const active = container?.querySelector<HTMLElement>('[data-active="true"]');
    if (!container || !active) return;
    const left = active.offsetLeft - container.offsetLeft;
    const right = left + active.offsetWidth;
    if (left < container.scrollLeft || right > container.scrollLeft + container.clientWidth) {
      container.scrollTo({
        left: Math.max(0, left - 16),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  }, [activeHref, reduceMotion]);

  return (
    <nav className="event-section-dock" aria-label="Event management">
      <div className="event-section-dock-scroll" ref={scrollRef}>
        {items.map(({ key, label, suffix }) => {
          const href = base + suffix;
          const active = activeHref === href;
          return (
            <Link
              key={key}
              href={href}
              prefetch={true}
              className="event-dock-item"
              data-active={active}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                if (isPlainLeftClick(event) && href !== activeHref) setPendingHref(href);
              }}
            >
              {active && (
                <motion.span
                  className="event-nav-active-pill"
                  layoutId={`passflow-event-nav-pill-${eventId}`}
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 38, mass: 0.7 }}
                  aria-hidden="true"
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
