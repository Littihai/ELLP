import type { AgeBand, AgeRule, Lesson, LessonProgress, OwnerSettings, Program, Quest, QuestProgress, Text2, UnlockRule, UserProfile } from "@/types";

/**
 * The gamification rules, pure functions only (no store, no React), so the C# backend can mirror them one to one
 * (backend/Ellp.Api/Modules/Progress/GamificationRules.cs has the same numbers and the same tests).
 */

/** XP a lesson's video pays when watched to the completion mark. */
export const WATCH_COMPLETE_PCT = 80;
/** XP for each right quiz answer, and a bonus for a perfect score. */
export const XP_PER_CORRECT = 10;
export const XP_PERFECT_BONUS = 20;
/** Streak bonus for the first activity of a day: 5 XP per day in a row, at most 25. */
export const XP_STREAK_PER_DAY = 5;
export const XP_STREAK_CAP = 25;
/** The quiz is passed at 60 % or more, unless the learner's age band says otherwise (settings.ageRules). */
export const QUIZ_PASS_PCT = 60;

/** Level thresholds (total XP) and the name each level carries. Level 1 is 0 XP. */
export const LEVELS: { level: number; xp: number; title: Text2 }[] = [
  { level: 1, xp: 0, title: { th: "ผู้เริ่มต้น", en: "Starter" } },
  { level: 2, xp: 100, title: { th: "นักสำรวจ", en: "Explorer" } },
  { level: 3, xp: 250, title: { th: "นักร้องน้อย", en: "Little Singer" } },
  { level: 4, xp: 500, title: { th: "นักฟังตัวยง", en: "Keen Listener" } },
  { level: 5, xp: 900, title: { th: "นักคำศัพท์", en: "Word Collector" } },
  { level: 6, xp: 1400, title: { th: "นักเล่าเรื่อง", en: "Storyteller" } },
  { level: 7, xp: 2000, title: { th: "ดาวรุ่ง", en: "Rising Star" } },
  { level: 8, xp: 2800, title: { th: "แชมป์", en: "Champion" } },
  { level: 9, xp: 3800, title: { th: "ตำนาน", en: "Legend" } },
  { level: 10, xp: 5000, title: { th: "ปรมาจารย์", en: "Master" } },
];

export function levelFor(xp: number): number {
  let lvl = 1;
  for (const l of LEVELS) if (xp >= l.xp) lvl = l.level;
  return lvl;
}

export function levelInfo(xp: number) {
  const level = levelFor(xp);
  const cur = LEVELS[level - 1];
  const next = LEVELS[level] ?? null;
  const span = next ? next.xp - cur.xp : 1;
  const into = xp - cur.xp;
  return {
    level,
    title: cur.title,
    nextLevelXp: next?.xp ?? null,
    xpIntoLevel: into,
    xpToNext: next ? next.xp - xp : 0,
    pct: next ? Math.min(100, Math.round((into / span) * 100)) : 100,
  };
}

export function quizXp(correct: number, total: number): number {
  if (total <= 0) return 0;
  return correct * XP_PER_CORRECT + (correct === total ? XP_PERFECT_BONUS : 0);
}

export function quizPassed(correct: number, total: number, passPct = QUIZ_PASS_PCT): boolean {
  return total > 0 && (correct / total) * 100 >= passPct;
}

export function streakBonus(streakDays: number): number {
  return Math.min(XP_STREAK_CAP, Math.max(0, streakDays) * XP_STREAK_PER_DAY);
}

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(d = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO week key, e.g. 2026-W45. */
export function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function periodKeyFor(scope: Quest["scope"], d = new Date()): string {
  return scope === "daily" ? dayKey(d) : scope === "weekly" ? weekKey(d) : "all";
}

/**
 * The next streak after an activity today: +1 when yesterday was active, unchanged when today was already counted.
 * A broken chain resets to 1, unless the learner's age band has `streakFreeze`: then the chain carries on (+1) as if no day was missed.
 */
export function nextStreak(streakDays: number, lastActiveDate: string | null, today = dayKey(), freeze = false): { streakDays: number; firstToday: boolean } {
  if (lastActiveDate === today) return { streakDays, firstToday: false };
  const y = new Date(today + "T00:00:00");
  y.setDate(y.getDate() - 1);
  const yesterday = dayKey(y);
  if (lastActiveDate === yesterday) return { streakDays: streakDays + 1, firstToday: true };
  return { streakDays: freeze && lastActiveDate !== null ? streakDays + 1 : 1, firstToday: true };
}

// ── age (decision 0004) ──

export const AGE_BANDS: AgeBand[] = ["3-5", "6-8", "9-12", "13+"];

/** Age in whole years from the birth year alone (the platform stores no birth date). */
export function ageOf(birthYear: number | null, now = new Date()): number | null {
  if (birthYear === null || birthYear < 1900) return null;
  return Math.max(0, now.getFullYear() - birthYear);
}

export function ageBandFor(age: number | null): AgeBand | null {
  if (age === null) return null;
  if (age <= 5) return "3-5";
  if (age <= 8) return "6-8";
  if (age <= 12) return "9-12";
  return "13+";
}

export function ageBandOf(user: Pick<UserProfile, "birthYear">, now = new Date()): AgeBand | null {
  return ageBandFor(ageOf(user.birthYear, now));
}

/** The defaults a tenant starts with: gentler for the youngest, the standard rules from 9 up. */
export const DEFAULT_AGE_RULES: Record<AgeBand, AgeRule> = {
  "3-5": { quizPassPct: 50, leaderboardVisible: false, streakFreeze: true },
  "6-8": { quizPassPct: 60, leaderboardVisible: true, streakFreeze: true },
  "9-12": { quizPassPct: 70, leaderboardVisible: true, streakFreeze: false },
  "13+": { quizPassPct: 70, leaderboardVisible: true, streakFreeze: false },
};
/** When the age is unknown the standard numbers apply (no band to be gentle or strict about). */
export const BASE_AGE_RULE: AgeRule = { quizPassPct: QUIZ_PASS_PCT, leaderboardVisible: true, streakFreeze: false };

export function ageRuleFor(settings: Pick<OwnerSettings, "ageRules"> | null | undefined, user: Pick<UserProfile, "birthYear">, now = new Date()): AgeRule {
  const band = ageBandOf(user, now);
  if (!band) return BASE_AGE_RULE;
  return settings?.ageRules?.[band] ?? DEFAULT_AGE_RULES[band];
}

/**
 * Whether a learner may see a program: the override opens everything, a program with no bands is for every age,
 * an unknown age is not held against the learner, otherwise the learner's band must be listed.
 */
export function programVisible(program: Pick<Program, "ageBands">, user: Pick<UserProfile, "birthYear" | "allowAllAges">, now = new Date()): boolean {
  if (user.allowAllAges || program.ageBands.length === 0) return true;
  const band = ageBandOf(user, now);
  return band === null || program.ageBands.includes(band);
}

export type UnlockCheck = { ok: boolean; failing: UnlockRule[] };

type RuleUser = Pick<UserProfile, "xp" | "streakDays" | "birthYear" | "allowAllAges">;

/** Every rule must pass. `progress` is the learner's lesson progress, `quests` their quest progress of the current periods. */
export function checkUnlock(lesson: Lesson, user: RuleUser, progress: LessonProgress[], quests: QuestProgress[], now = new Date()): UnlockCheck {
  const failing = lesson.unlock.filter((r) => !rulePasses(r, user, progress, quests, now));
  return { ok: failing.length === 0, failing };
}

export function rulePasses(r: UnlockRule, user: RuleUser, progress: LessonProgress[], quests: QuestProgress[], now = new Date()): boolean {
  switch (r.type) {
    case "lesson_completed": return progress.some((p) => p.lessonId === r.lessonId && p.completed);
    case "min_level": return levelFor(user.xp) >= r.level;
    case "min_xp": return user.xp >= r.xp;
    case "quest_completed": return quests.some((q) => q.questId === r.questId && q.completed);
    case "streak_days": return user.streakDays >= r.days;
    // the age rules: the override opens them; an unknown age fails them (a teacher adds the birth year on the Members page)
    case "min_age": { if (user.allowAllAges) return true; const a = ageOf(user.birthYear, now); return a !== null && a >= r.years; }
    case "age_band": { if (user.allowAllAges) return true; const b = ageBandOf(user, now); return b !== null && r.bands.includes(b); }
  }
}

/** A lesson is complete when the video reached the mark and the quiz (if any) was passed at the learner's pass mark. */
export function lessonComplete(l: Lesson, p: LessonProgress | undefined, passPct = QUIZ_PASS_PCT): boolean {
  if (!p) return false;
  const watched = p.watchedPct >= WATCH_COMPLETE_PCT;
  if (l.quiz.length === 0) return watched;
  return watched && p.quizScore !== null && p.quizTotal !== null && quizPassed(p.quizScore, p.quizTotal, passPct);
}
