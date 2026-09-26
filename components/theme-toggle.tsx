"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "passflow-theme";

function applyTheme(mode: ThemeMode) {
  if (mode === "system") {
    document.documentElement.removeAttribute("data-theme");
    return;
  }
  document.documentElement.dataset.theme = mode;
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const nextMode: ThemeMode =
      stored === "light" || stored === "dark" ? stored : "system";
    setMode(nextMode);
    applyTheme(nextMode);
  }, []);

  function choose(nextMode: ThemeMode) {
    setMode(nextMode);
    if (nextMode === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    }
    applyTheme(nextMode);
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
          onClick={() => choose(value)}
        >
          <Icon size={14} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
