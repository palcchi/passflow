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
  PanelLeftClose,
  Settings2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { FlowMark } from "@/components/flow-art";

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
    { href: "/account", label: "Home", icon: LayoutDashboard },
    { href: "/events", label: "Discover", icon: CalendarDays },
    ...(organizer
      ? [{ href: "/organizer/events", label: "Organizer", icon: Sparkles }]
      : []),
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

  // Desktop sidebar can shrink to an icon rail; the choice is remembered (see layout theme script).
  function toggleSidebar() {
    const root = document.documentElement;
    const collapsed = root.dataset.sidebar !== "collapsed";
    if (collapsed) root.dataset.sidebar = "collapsed";
    else delete root.dataset.sidebar;
    try { localStorage.setItem("passflow-sidebar", collapsed ? "collapsed" : "open"); } catch {}
  }

  function go(href: string) {
    setPendingHref(href);
    setMenuOpen(false);
  }

  return (
    <>
    <nav ref={rootRef} className="user-nav-shell flow-sidebar" aria-label="Workspace navigation">
      <div className="user-nav user-nav-flat">
        <div className="user-nav-left">
          <div className="user-nav-brand-row">
            <Link href="/account" className="user-nav-brand" aria-label="PassFlow dashboard">
              <FlowMark/>
              <span>PassFlow</span>
            </Link>
            <button type="button" className="sidebar-toggle" onClick={toggleSidebar} aria-label="Collapse or expand sidebar" title="Collapse or expand sidebar">
              <PanelLeftClose size={16} />
            </button>
          </div>

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
                  title={label}
                  onClick={() => go(href)}
                >
                  {isActive && (
                    <motion.span
                      className="user-nav-active-pill"
                      layoutId="passflow-global-nav-pill"
                      transition={pillTransition}
                    />
                  )}
                  <span className="user-nav-link-content"><Icon size={16}/><span className="user-nav-link-label">{label}</span></span>
                </Link>
              );
            })}
          </div>
        </div>


        <div className="user-nav-actions">
          <ThemeToggle compact />


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
            {!organizer && (
              <Link href="/organizer/start" onClick={() => setMenuOpen(false)}>
                <Settings2 size={16} />
                <span>
                  <strong>Become an organizer</strong>
                  <small>Apply to host events on PassFlow</small>
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
