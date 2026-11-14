"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications/unread", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ count?: number }> : { count: 0 })
      .then((data) => { if (!cancelled) setUnread(Number.isFinite(data.count) ? Math.max(0, Number(data.count)) : 0); })
      .catch(() => { if (!cancelled) setUnread(0); });
    return () => { cancelled = true; };
  }, [pathname]);

  return (
    <Link href="/notifications" className="ui-iconbtn" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} data-active={pathname === "/notifications" || undefined}>
      <Bell size={17} />
      {unread > 0 && <span className="ui-dot-count">{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );
}
