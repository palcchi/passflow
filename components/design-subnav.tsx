"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { suffix: "", label: "Figma website" },
  { suffix: "/content", label: "Website content" },
  { suffix: "/studio", label: "Pass layouts" },
  { suffix: "/legacy", label: "Legacy sync" },
] as const;

export function DesignSubnav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/admin/events/${eventId}/design`;
  return (
    <nav className="design-subnav" aria-label="Design sections">
      {sections.map(({ suffix, label }) => {
        const href = base + suffix;
        const active = suffix
          ? pathname === href || pathname.startsWith(href + "/")
          : pathname === base || pathname.startsWith(base + "/preview");
        return (
          <Link
            key={href}
            href={href}
            className="design-subnav-item"
            data-active={active}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
