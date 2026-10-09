"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function NotificationBell() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  // Recount when the route changes so reading notifications clears the badge.
  useEffect(() => {
    let cancelled = false;
    try {
      createBrowserSupabaseClient()
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .then(({ count }) => { if (!cancelled) setUnread(count ?? 0); });
    } catch { /* Supabase not configured */ }
    return () => { cancelled = true; };
  }, [pathname]);

  return (
    <Link href="/notifications" className="ui-iconbtn" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} data-active={pathname === "/notifications" || undefined}>
      <Bell size={17} />
      {unread > 0 && <span className="ui-dot-count">{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );
}
