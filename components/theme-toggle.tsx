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

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, readTheme, () => "system");

  function choose(nextMode: ThemeMode) {
    if (nextMode === mode) return;

    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      persistTheme(nextMode);
      applyTheme(nextMode);
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return;
    }

    root.classList.add("theme-switching");
    persistTheme(nextMode);
    applyTheme(nextMode);
    window.dispatchEvent(new Event(CHANGE_EVENT));

    window.setTimeout(() => {
      root.classList.remove("theme-switching");
    }, 180);
  }

  const options = [
    { value: "system" as const, label: "System", Icon: Monitor },
    { value: "light" as const, label: "Light", Icon: Sun },
    { value: "dark" as const, label: "Dark", Icon: Moon },
  ];

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
          onClick={() => choose(value)}
        >
          <Icon size={13} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
