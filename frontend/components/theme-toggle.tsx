"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const storageKey = "zap_theme";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(storageKey, theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const initialTheme = getPreferredTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function handleToggle() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      aria-label={`Ativar tema ${theme === "light" ? "escuro" : "claro"}`}
      className="theme-toggle"
      onClick={handleToggle}
      type="button"
    >
      <span className="theme-toggle-thumb" aria-hidden="true">
        {theme === "dark" ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path
              d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M12 2.75V5.2M12 18.8v2.45M21.25 12H18.8M5.2 12H2.75M18.54 5.46l-1.73 1.73M7.19 16.81l-1.73 1.73M18.54 18.54l-1.73-1.73M7.19 7.19 5.46 5.46"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
