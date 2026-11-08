import type { Lesson, LessonProgress, Quest, QuestProgress, Text2, UnlockRule, UserProfile } from "@/types";

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
/** The quiz is passed at 60 % or more. */
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

export function quizPassed(correct: number, total: number): boolean {
  return total > 0 && (correct / total) * 100 >= QUIZ_PASS_PCT;
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

/** The next streak after an activity today: +1 when yesterday was active, 1 when the chain broke, unchanged when today was already counted. */
export function nextStreak(streakDays: number, lastActiveDate: string | null, today = dayKey()): { streakDays: number; firstToday: boolean } {
  if (lastActiveDate === today) return { streakDays, firstToday: false };
  const y = new Date(today + "T00:00:00");
  y.setDate(y.getDate() - 1);
  const yesterday = dayKey(y);
  return { streakDays: lastActiveDate === yesterday ? streakDays + 1 : 1, firstToday: true };
}

export type UnlockCheck = { ok: boolean; failing: UnlockRule[] };

/** Every rule must pass. `progress` is the learner's lesson progress, `quests` their quest progress of the current periods. */
export function checkUnlock(
  lesson: Lesson,
  user: Pick<UserProfile, "xp" | "streakDays">,
  progress: LessonProgress[],
  quests: QuestProgress[],
): UnlockCheck {
  const failing = lesson.unlock.filter((r) => !rulePasses(r, user, progress, quests));
  return { ok: failing.length === 0, failing };
}

export function rulePasses(
  r: UnlockRule,
  user: Pick<UserProfile, "xp" | "streakDays">,
  progress: LessonProgress[],
  quests: QuestProgress[],
): boolean {
  switch (r.type) {
    case "lesson_completed": return progress.some((p) => p.lessonId === r.lessonId && p.completed);
    case "min_level": return levelFor(user.xp) >= r.level;
    case "min_xp": return user.xp >= r.xp;
    case "quest_completed": return quests.some((q) => q.questId === r.questId && q.completed);
    case "streak_days": return user.streakDays >= r.days;
  }
}

/** A lesson is complete when the video reached the mark and the quiz (if any) was passed. */
export function lessonComplete(l: Lesson, p: LessonProgress | undefined): boolean {
  if (!p) return false;
  const watched = p.watchedPct >= WATCH_COMPLETE_PCT;
  if (l.quiz.length === 0) return watched;
  return watched && p.quizScore !== null && p.quizTotal !== null && quizPassed(p.quizScore, p.quizTotal);
}
