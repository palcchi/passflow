"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, LogOut, Settings2, Sparkles, UserRound } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { FlowMark } from "@/components/flow-art";

type UserNavbarProps = {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  organizer?: boolean;
};

export function UserNavbar({ name, email, avatarUrl, organizer = false }: UserNavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = (name || email || "P").trim().charAt(0).toUpperCase() || "P";

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", closeOutside, true); document.removeEventListener("keydown", escape); };
  }, [menuOpen]);

  const [previousPath, setPreviousPath] = useState(pathname);
  if (previousPath !== pathname) { setPreviousPath(pathname); setMenuOpen(false); }

  const navItems = [
    { href: "/account", label: "Home", icon: Home },
    { href: "/events", label: "Discover", icon: CalendarDays },
    ...(organizer ? [{ href: "/organizer/events", label: "Organizer", icon: Sparkles }] : []),
  ];
  const isActive = (href: string) => href === "/account" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  const avatarStyle = avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined;

  return (
    <>
      <a href="#main" className="ui-skip">Skip to content</a>
      <header className="ui-topnav">
        <div className="ui-topnav-inner">
          <Link href="/account" className="ui-brand" aria-label="PassFlow home"><FlowMark /><span>PassFlow</span></Link>
          <nav className="ui-navlinks" aria-label="Main">
            {navItems.map(({ href, label }) => (
              <Link key={href} href={href} className="ui-navlink" aria-current={isActive(href) ? "page" : undefined}>{label}</Link>
            ))}
          </nav>
          <div className="ui-navactions">
            <NotificationBell />
            <div className="ui-account" ref={menuRef}>
              <button type="button" className="ui-account-btn" aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen(!menuOpen)}>
                <span className="ui-avatar" style={avatarStyle}>{!avatarUrl && initial}</span>
                <span>{name}</span>
              </button>
              {menuOpen && (
                <div className="ui-menu" role="menu">
                  <div className="ui-menu-head">
                    <span className="ui-avatar ui-avatar-lg" style={avatarStyle}>{!avatarUrl && initial}</span>
                    <div><strong>{name}</strong><small>{email}</small></div>
                  </div>
                  <hr />
                  <Link href="/profile" role="menuitem"><UserRound size={16} />Profile</Link>
                  {!organizer && <Link href="/organizer/start" role="menuitem"><Settings2 size={16} />Become an organizer</Link>}
                  <div className="ui-menu-row"><span>Appearance</span><ThemeToggle /></div>
                  <hr />
                  <form action={signOut}><button type="submit" role="menuitem" className="ui-menu-danger"><LogOut size={16} />Sign out</button></form>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="ui-tabbar" aria-label="Main">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="ui-tab" aria-current={isActive(href) ? "page" : undefined}>
            <Icon size={20} strokeWidth={isActive(href) ? 2.2 : 1.8} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
