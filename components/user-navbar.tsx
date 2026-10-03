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
  Plus,
  Settings2,
  Sparkles,
  UserRound,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const initial = (name || email || "P").trim().charAt(0).toUpperCase() || "P";

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside, true);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const [previousPath, setPreviousPath] = useState(pathname);
  if (previousPath !== pathname) {
    setPreviousPath(pathname);
    setPendingHref(null);
  }

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

  const pillTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.82 };

  function go(href: string) {
    setPendingHref(href);
    setMenuOpen(false);
  }

  return (
    <>
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
                  onClick={() => go(href)}
                >
                  {isActive && (
                    <motion.span
                      className="user-nav-active-pill"
                      layoutId="passflow-global-nav-pill"
                      transition={pillTransition}
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
          <ThemeToggle compact />

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
            aria-expanded={menuOpen}
            aria-label="Account menu"
            onClick={() => setMenuOpen(!menuOpen)}
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
              className={menuOpen ? "is-open" : ""}
            />
          </button>
        </div>

        {menuOpen && (
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
            <div className="user-profile-menu-theme">
              <span>Appearance</span>
              <ThemeToggle />
            </div>
            <Link href="/profile" onClick={() => setMenuOpen(false)}>
              <UserRound size={16} />
              <span>
                <strong>Profile</strong>
                <small>Photo, name, username, and Figma</small>
              </span>
            </Link>
            <Link href={organizer ? "/admin" : "/organizer/start"} onClick={() => setMenuOpen(false)}>
              <Settings2 size={16} />
              <span>
                <strong>{organizer ? "Organizer workspace" : "Become an organizer"}</strong>
                <small>{organizer ? "Event, scanner, design" : "Apply to host events on PassFlow"}</small>
              </span>
            </Link>
            <form action={signOut}>
              <button type="submit" className="user-profile-logout">
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        )}

      </div>
    </nav>

    {/* Phone and iPad: thumb-reachable tab bar, like a native app. */}
    <nav className="user-tabbar" aria-label="Workspace tabs">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = active(href);
        return (
          <Link
            href={href}
            key={href}
            className="user-tab"
            data-active={isActive}
            aria-current={isActive ? "page" : undefined}
            onClick={() => go(href)}
          >
            {isActive && (
              <motion.span
                className="user-tab-pill"
                layoutId="passflow-tab-pill"
                transition={pillTransition}
              />
            )}
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
    </>
  );
}
