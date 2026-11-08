import type { Lesson, LessonProgress, Text2, UserProfile, WeeklyReport, XpEvent } from "@/types";
import { dayKey, levelFor, quizPassed, weekKey } from "./gamification";
import { SKILL_NAMES, skillProfile, strongestWeakest } from "./skills";

/**
 * Parent accounts and the weekly report (1.4, decision 0008), pure functions mirrored in backend Modules/Family/FamilyRules.cs.
 * A parent may read a child's data when the child is in their `childUids` and both belong to the same tenant.
 */

export function canViewChild(parent: Pick<UserProfile, "role" | "ownerId" | "childUids">, child: Pick<UserProfile, "uid" | "ownerId" | "role">): boolean {
  return parent.role === "parent" && child.role === "learner" && parent.ownerId !== null && parent.ownerId === child.ownerId && parent.childUids.includes(child.uid);
}

/** Monday and Sunday (local calendar dates) of an ISO week key such as 2026-W45. */
export function weekRange(key: string): { from: string; to: string } {
  const m = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!m) return { from: key, to: key };
  const year = parseInt(m[1], 10), week = parseInt(m[2], 10);
  // 4 January is always in ISO week 1; its Monday is the start of the year's weeks
  const jan4 = new Date(year, 0, 4);
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1) + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: dayKey(monday), to: dayKey(sunday) };
}

/** The ISO week keys of this week and the `back` weeks before it, newest first. */
export function recentWeeks(back: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i <= back; i++) { const d = new Date(now); d.setDate(d.getDate() - 7 * i); out.push(weekKey(d)); }
  return out;
}

/**
 * One child's week from the ledger and the progress rows: XP and active days from the events of the week, lessons finished
 * and quizzes passed from rows completed or updated in the week, minutes from the lessons' lengths, the skill profile overall.
 */
export function buildWeeklyReport(child: Pick<UserProfile, "uid" | "displayName" | "xp" | "streakDays">, lessons: Lesson[], progress: LessonProgress[], events: XpEvent[], key: string): WeeklyReport {
  const inWeek = (iso: string | null) => !!iso && weekKey(new Date(iso)) === key;
  const weekEvents = events.filter((e) => e.uid === child.uid && inWeek(e.at));
  const mine = progress.filter((p) => p.uid === child.uid);
  const touched = mine.filter((p) => inWeek(p.updatedAt) || inWeek(p.completedAt));
  const lessonOf = (id: string) => lessons.find((l) => l.id === id);
  const minutes = Math.round(touched.reduce((n, p) => { const l = lessonOf(p.lessonId); return n + (p.completed && inWeek(p.completedAt) ? (l?.durationSec ?? 0) : Math.min(p.watchedSec, l?.durationSec ?? p.watchedSec)); }, 0) / 60);
  const skills = skillProfile(lessons, mine);
  const { strongest, weakest } = strongestWeakest(skills);
  const { from, to } = weekRange(key);
  const r: WeeklyReport = {
    uid: child.uid, weekKey: key, from, to,
    xp: weekEvents.reduce((n, e) => n + e.xp, 0),
    lessonsDone: mine.filter((p) => p.completed && inWeek(p.completedAt)).length,
    quizzesPassed: touched.filter((p) => p.quizScore !== null && p.quizTotal !== null && quizPassed(p.quizScore, p.quizTotal)).length,
    activeDays: new Set(weekEvents.map((e) => dayKey(new Date(e.at)))).size,
    minutes,
    level: levelFor(child.xp),
    streakDays: child.streakDays,
    skills, strongest, weakest,
    summary: { th: "", en: "" },
  };
  r.summary = summarize(child.displayName, r);
  return r;
}

/** The plain sentences of the report, from the numbers only (the server builds the same text for the email). */
export function summarize(name: string, r: Pick<WeeklyReport, "xp" | "lessonsDone" | "activeDays" | "minutes" | "streakDays" | "strongest" | "weakest">): Text2 {
  if (r.xp === 0 && r.lessonsDone === 0) {
    return {
      th: `สัปดาห์นี้ ${name} ยังไม่ได้เข้าเรียน ลองชวนดูวิดีโอสั้น ๆ สัก 1 บทด้วยกันนะคะ`,
      en: `${name} did not learn this week. A short video together is an easy restart.`,
    };
  }
  const th = [`สัปดาห์นี้ ${name} เข้าเรียน ${r.activeDays} วัน รวมประมาณ ${r.minutes} นาที จบ ${r.lessonsDone} บท และได้ ${r.xp} XP`];
  const en = [`This week ${name} learned on ${r.activeDays} day(s), about ${r.minutes} minutes, finished ${r.lessonsDone} lesson(s) and earned ${r.xp} XP.`];
  if (r.strongest) { th.push(`ทำได้ดีที่สุดด้าน${SKILL_NAMES[r.strongest].th}`); en.push(`Strongest skill: ${SKILL_NAMES[r.strongest].en}.`); }
  if (r.weakest) { th.push(`ส่วนที่ควรฝึกเพิ่มคือ${SKILL_NAMES[r.weakest].th}`); en.push(`Worth more practice: ${SKILL_NAMES[r.weakest].en}.`); }
  if (r.streakDays >= 3) { th.push(`เรียนต่อเนื่อง ${r.streakDays} วันแล้ว เยี่ยมมาก`); en.push(`A ${r.streakDays}-day streak, well done.`); }
  return { th: th.join(" "), en: en.join(" ") };
}
