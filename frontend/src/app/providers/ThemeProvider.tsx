import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Light / dark / follow-the-OS theme, per device (localStorage). `public/theme-init.js` applies it before the first paint;
 * the theme itself is CSS: `<html data-theme="dark">` swaps the tokens in styles/tokens.css.
 */
export type ThemePref = "light" | "dark" | "system";
type Resolved = "light" | "dark";
const KEY = "ellp.theme";
const MEDIA = "(prefers-color-scheme: dark)";

interface Ctx { pref: ThemePref; resolved: Resolved; setPref: (p: ThemePref) => void; toggle: () => void }
const ThemeContext = createContext<Ctx | null>(null);

function saved(): ThemePref {
  try { const v = localStorage.getItem(KEY); if (v === "light" || v === "dark" || v === "system") return v; } catch { /* ignore */ }
  return "light";
}
const systemDark = () => { try { return window.matchMedia(MEDIA).matches; } catch { return false; } };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(saved);
  const [sys, setSys] = useState(systemDark);
  useEffect(() => {
    const mq = window.matchMedia(MEDIA);
    const on = (e: MediaQueryListEvent) => setSys(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const resolved: Resolved = pref === "system" ? (sys ? "dark" : "light") : pref;
  useEffect(() => {
    const root = document.documentElement;
    if (resolved === "dark") root.setAttribute("data-theme", "dark"); else root.removeAttribute("data-theme");
  }, [resolved]);
  const setPref = useCallback((p: ThemePref) => { setPrefState(p); try { localStorage.setItem(KEY, p); } catch { /* ignore */ } }, []);
  const toggle = useCallback(() => setPref(resolved === "dark" ? "light" : "dark"), [resolved, setPref]);
  const value = useMemo(() => ({ pref, resolved, setPref, toggle }), [pref, resolved, setPref, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const c = useContext(ThemeContext);
  if (!c) throw new Error("useTheme outside ThemeProvider");
  return c;
}
