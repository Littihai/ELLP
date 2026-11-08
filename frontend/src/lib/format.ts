import type { Lang } from "@/types";

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtDate(iso: string | null | undefined, lang: Lang, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(lang === "th" ? "th-TH" : "en-GB", withTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" });
}

export function fmtNum(n: number): string {
  return n.toLocaleString();
}

/** Avatar initials: the first letter of the first and last word, or two letters of a single word; text in parentheses is ignored and a Thai letter keeps its vowel and tone marks. */
export function initials(name: string): string {
  const parts = name.replace(/\([^)]*\)/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const graphemes = (s: string) => s.match(/\P{M}\p{M}*/gu) ?? [];
  if (parts.length === 1) return graphemes(parts[0]).slice(0, 2).join("").toUpperCase();
  return ((graphemes(parts[0])[0] ?? "") + (graphemes(parts[parts.length - 1])[0] ?? "")).toUpperCase();
}

export function newId(prefix: string): string {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
