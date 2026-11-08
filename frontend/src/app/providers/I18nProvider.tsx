import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { tr, type Lang } from "@/i18n/dict";
import type { Text2 } from "@/types";

export type { Lang };
const KEY = "ellp.lang";

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** translate a dotted key, with {name} variables */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** pick from an inline { th, en } pair (catalog data) */
  pick: (pair: Text2 | null | undefined) => string;
}
const I18nContext = createContext<Ctx | null>(null);

function saved(): Lang {
  try { const v = localStorage.getItem(KEY); if (v === "th" || v === "en") return v; } catch { /* ignore */ }
  return "th";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(saved);
  useEffect(() => { document.documentElement.lang = lang; try { localStorage.setItem(KEY, lang); } catch { /* ignore */ } }, [lang]);
  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const t = useCallback((key: string, vars?: Record<string, string | number>) => tr(lang, key, vars), [lang]);
  const pick = useCallback((pair: Text2 | null | undefined) => (pair ? pair[lang] || pair.en || pair.th : ""), [lang]);
  const value = useMemo(() => ({ lang, setLang, t, pick }), [lang, setLang, t, pick]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}
