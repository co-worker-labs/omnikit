import { createContext, useContext, useEffect, useSyncExternalStore, ReactNode } from "react";
import { COOKIE_KEYS } from "./storage-keys";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
});

const COOKIE_KEY = COOKIE_KEYS.theme;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readCookieTheme(): Theme | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_KEY}=(light|dark)`));
  return match ? (match[1] as Theme) : null;
}

function writeCookieTheme(theme: Theme) {
  document.cookie = `${COOKIE_KEY}=${theme};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
}

function readCurrentTheme(): Theme {
  const stored = readCookieTheme();
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function emit() {
  listeners.forEach((l) => l());
}

function getSnapshot(): Theme {
  return readCurrentTheme();
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: Theme;
}) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => initialTheme);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (readCookieTheme()) return;
      applyTheme(e.matches ? "dark" : "light");
      emit();
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    writeCookieTheme(next);
    applyTheme(next);
    emit();
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
