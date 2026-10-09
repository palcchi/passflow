"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const items = [
  { key: "overview", label: "Overview", suffix: "" },
  { key: "people", label: "People", suffix: "/people" },
  { key: "operations", label: "Operations", suffix: "/operations" },
  { key: "design", label: "Design", suffix: "/design" },
  { key: "settings", label: "Settings", suffix: "/settings" },
] as const;

export function EventAdminNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/organizer/events/${eventId}`;
  const scrollRef = useRef<HTMLDivElement>(null);

  // On narrow screens the tabs scroll sideways; keep the current tab in view.
  useEffect(() => {
    scrollRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [pathname]);

  return (
    <nav className="ui-tabs" aria-label="Event management">
      <div ref={scrollRef}>
        {items.map(({ key, label, suffix }) => {
          const href = base + suffix;
          const active = suffix ? pathname === href || pathname.startsWith(href + "/") : pathname === base;
          return <Link key={key} href={href} prefetch aria-current={active ? "page" : undefined}>{label}</Link>;
        })}
      </div>
    </nav>
  );
}
