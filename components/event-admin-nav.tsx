"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { key: "overview", label: "Overview", suffix: "" },
  { key: "people", label: "People", suffix: "/people" },
  { key: "access", label: "Access", suffix: "/access" },
  { key: "experience", label: "Experience", suffix: "/experience" },
  { key: "settings", label: "Settings", suffix: "/settings" },
] as const;

export function EventAdminNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/admin/events/${eventId}`;

  return (
    <nav className="event-section-dock" aria-label="Event management">
      <div className="event-section-dock-scroll">
        {items.map(({ key, label, suffix }) => {
          const href = base + suffix;
          const active = suffix
            ? pathname === href || pathname.startsWith(href + "/")
            : pathname === base;
          return (
            <Link
              key={key}
              href={href}
              className="event-dock-item"
              data-active={active}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
