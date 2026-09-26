"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings2,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";

type UserNavbarProps = {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  organizer?: boolean;
};

export function UserNavbar({
  name,
  email,
  avatarUrl,
  organizer = false,
}: UserNavbarProps) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<"profile" | "mobile" | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const initial = (name || email || "P").trim().charAt(0).toUpperCase() || "P";

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside, true);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const navItems = [
    { href: "/account", label: "Dashboard", icon: LayoutDashboard },
    { href: "/events", label: "Event", icon: CalendarDays },
    ...(organizer
      ? [{ href: "/admin", label: "Organizer", icon: Sparkles }]
      : []),
  ];

  function active(href: string) {
    return href === "/account"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav ref={rootRef} className="user-nav-shell">
      <div className="user-nav user-nav-flat">
        <div className="user-nav-left">
          <Link href="/account" className="user-nav-brand" aria-label="PassFlow dashboard">
            <span className="brand-mark user-nav-brand-mark">P</span>
            <span>PassFlow</span>
          </Link>

          <div className="user-nav-links">
            {navItems.map(({ href, label }) => (
              <Link
                href={href}
                key={href}
                className="user-nav-link"
                data-active={active(href)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="user-nav-actions">
          <ThemeToggle />

          <Link
            href="/events"
            className="user-nav-icon-button"
            aria-label="Tambah event"
            title="Tambah event"
          >
            <Plus size={18} />
          </Link>

          <button
            type="button"
            className="user-profile-trigger"
            aria-expanded={openMenu === "profile"}
            onClick={() => setOpenMenu(openMenu === "profile" ? null : "profile")}
          >
            <span
              className="user-avatar"
              style={avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined}
            >
              {!avatarUrl && initial}
            </span>
            <span className="user-profile-trigger-copy">
              <strong>{name}</strong>
              <small>{organizer ? "Organizer" : "Attendee"}</small>
            </span>
            <ChevronDown
              size={14}
              className={openMenu === "profile" ? "is-open" : ""}
            />
          </button>

          <button
            type="button"
            className="user-mobile-menu-button"
            aria-label={openMenu === "mobile" ? "Tutup menu" : "Buka menu"}
            aria-expanded={openMenu === "mobile"}
            onClick={() => setOpenMenu(openMenu === "mobile" ? null : "mobile")}
          >
            {openMenu === "mobile" ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {openMenu === "profile" && (
          <div className="user-profile-menu flat-popover">
            <div className="user-profile-menu-head">
              <span
                className="user-avatar user-avatar-large"
                style={avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined}
              >
                {!avatarUrl && initial}
              </span>
              <div>
                <strong>{name}</strong>
                <small>{email}</small>
              </div>
            </div>
            <div className="user-profile-menu-divider" />
            <Link href="/profile" onClick={() => setOpenMenu(null)}>
              <UserRound size={16} />
              <span>
                <strong>Profile</strong>
                <small>Foto, nama, username, Figma</small>
              </span>
            </Link>
            {organizer && (
              <Link href="/admin" onClick={() => setOpenMenu(null)}>
                <Settings2 size={16} />
                <span>
                  <strong>Organizer workspace</strong>
                  <small>Event, scanner, design</small>
                </span>
              </Link>
            )}
            <form action={signOut}>
              <button type="submit" className="user-profile-logout">
                <LogOut size={16} />
                <span>Keluar</span>
              </button>
            </form>
          </div>
        )}

        {openMenu === "mobile" && (
          <div className="user-mobile-menu flat-popover">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                href={href}
                key={href}
                data-active={active(href)}
                onClick={() => setOpenMenu(null)}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            <Link href="/profile" onClick={() => setOpenMenu(null)}>
              <UserRound size={16} />
              Profile
            </Link>
            <form action={signOut}>
              <button type="submit">
                <LogOut size={16} />
                Keluar
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
  );
}
