"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "passflow-theme";
const CHANGE_EVENT = "passflow-theme-change";

function readTheme(): ThemeMode {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function applyTheme(mode: ThemeMode) {
  if (mode === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.dataset.theme = mode;
  }
}

function persistTheme(mode: ThemeMode) {
  if (mode === "system") window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, mode);
}

// compact: one icon button that flips light/dark (navbars). Default: System/Light/Dark segmented control.
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const mode = useSyncExternalStore(subscribe, readTheme, () => "system");

  function choose(nextMode: ThemeMode, origin: HTMLElement) {
    if (nextMode === mode) return;

    const commit = () => {
      persistTheme(nextMode);
      applyTheme(nextMode);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    };
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !document.startViewTransition) return commit();

    // Circular reveal from the clicked button. Route view-transition names are
    // switched off for the duration so only the single root snapshot animates.
    const { left, top, width, height } = origin.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty("--theme-r", `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
    root.classList.add("theme-switching");
    document.startViewTransition(commit).finished.finally(() => root.classList.remove("theme-switching"));
  }

  const options = [
    { value: "system" as const, label: "System", Icon: Monitor },
    { value: "light" as const, label: "Light", Icon: Sun },
    { value: "dark" as const, label: "Dark", Icon: Moon },
  ];

  if (compact) {
    // Icons swap in CSS from the resolved theme, so server and client markup match.
    return (
      <button
        type="button"
        className="theme-flip"
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
        onClick={(event) => {
          const root = document.documentElement;
          const dark = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
          choose(dark ? "light" : "dark", event.currentTarget);
        }}
      >
        <Moon size={15} className="theme-flip-moon" />
        <Sun size={15} className="theme-flip-sun" />
      </button>
    );
  }

  return (
    <div className="theme-toggle" aria-label="Appearance theme">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          className="theme-toggle-option"
          data-active={mode === value}
          aria-pressed={mode === value}
          aria-label={label}
          title={label}
          onClick={(event) => choose(value, event.currentTarget)}
        >
          <Icon size={13} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
