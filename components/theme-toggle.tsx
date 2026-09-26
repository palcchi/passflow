"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemeMode = "system" | "light" | "dark";
type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    ready: Promise<void>;
  };
};

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

  async function choose(nextMode: ThemeMode, button: HTMLButtonElement) {
    if (nextMode === mode) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const transitionDocument = document as TransitionDocument;
    if (reduceMotion || !transitionDocument.startViewTransition) {
      persistTheme(nextMode);
      applyTheme(nextMode);
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return;
    }

    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = transitionDocument.startViewTransition(() => {
      persistTheme(nextMode);
      applyTheme(nextMode);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    });

    await transition.ready;
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 430,
        easing: "cubic-bezier(.22,.8,.3,1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  }

  const options = [
    { value: "system" as const, label: "System", Icon: Monitor },
    { value: "light" as const, label: "Light", Icon: Sun },
    { value: "dark" as const, label: "Dark", Icon: Moon },
  ];

  return (
    <div className="theme-toggle" aria-label="Tema tampilan">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          className="theme-toggle-option"
          data-active={mode === value}
          aria-pressed={mode === value}
          aria-label={label}
          title={label}
          onClick={(event) => void choose(value, event.currentTarget)}
        >
          <Icon size={13} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
