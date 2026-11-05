import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

/** Must match the inline pre-paint script in index.html. */
const STORAGE_KEY = "kp-theme";
const THEME_COLORS: Record<Theme, string> = { light: "#cfe0f2", dark: "#141a34" };

const listeners = new Set<() => void>();

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  listeners.forEach((listener) => listener());
}

/** Explicit choice from the toggle: applied and remembered. */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the choice still applies for this visit.
  }
  apply(theme);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Follow the OS setting until the visitor picks a theme themselves.
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = (event: MediaQueryListEvent): void => {
    if (readStored() === null) apply(event.matches ? "dark" : "light");
  };
  mql.addEventListener("change", onSystemChange);
  return () => {
    listeners.delete(listener);
    mql.removeEventListener("change", onSystemChange);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "light");
}
