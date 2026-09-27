"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
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
import { FlowMark, FlowShapes } from "@/components/flow-art";

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
  const reduceMotion = useReducedMotion();
  const [openMenu, setOpenMenu] = useState<"profile" | "mobile" | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
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

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const navItems = [
    { href: "/account", label: "Dashboard", icon: LayoutDashboard },
    { href: "/events", label: "Events", icon: CalendarDays },
    ...(organizer
      ? [{ href: "/admin", label: "Organizer", icon: Sparkles }]
      : []),
    { href: "/profile", label: "Profile", icon: UserRound },
  ];

  function routeActive(href: string) {
    return href === "/account"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
  }

  function active(href: string) {
    return pendingHref ? pendingHref === href : routeActive(href);
  }

  return (
    <nav ref={rootRef} className="user-nav-shell flow-sidebar" aria-label="Workspace navigation">
      <div className="user-nav user-nav-flat">
        <div className="user-nav-left">
          <Link href="/account" className="user-nav-brand" aria-label="PassFlow dashboard">
            <FlowMark/>
            <span>PassFlow</span>
          </Link>

          <div className="user-nav-links">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = active(href);
              return (
                <Link
                  href={href}
                  key={href}
                  prefetch={true}
                  className="user-nav-link"
                  data-active={isActive}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    setPendingHref(href);
                    setOpenMenu(null);
                  }}
                >
                  {isActive && (
                    <motion.span
                      className="user-nav-active-pill"
                      layoutId="passflow-global-nav-pill"
                      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30, mass: 0.82 }}
                    />
                  )}
                  <span className="user-nav-link-content"><Icon size={16}/>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flow-sidebar-note"><FlowShapes/><strong>Make events flow.</strong><span>One workspace for every event.</span></div>

        <div className="user-nav-actions">
          <ThemeToggle />

          <Link
            href={organizer ? "/admin/events/new" : "/events"}
            prefetch={true}
            className="user-nav-icon-button"
            aria-label={organizer ? "Create event" : "Explore events"}
            title={organizer ? "Create event" : "Explore events"}
          >
            <Plus size={18} />
          </Link>

          <button
            type="button"
            className="user-profile-trigger"
            aria-expanded={openMenu === "profile"}
            aria-label="Account menu"
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
            aria-label={openMenu === "mobile" ? "Close menu" : "Open menu"}
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
                <small>Photo, name, username, and Figma</small>
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
                <span>Sign out</span>
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
                aria-current={active(href) ? "page" : undefined}
                onClick={() => {
                  setPendingHref(href);
                  setOpenMenu(null);
                }}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            <form action={signOut}>
              <button type="submit">
                <LogOut size={16} />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
  );
}
