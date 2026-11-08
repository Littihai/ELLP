import { SKILLS, type Lesson, type LessonProgress, type Skill, type SkillProfileRow, type Text2 } from "@/types";

/**
 * The skill profile (1.4, decision 0008), pure functions mirrored in backend Modules/Family/FamilyRules.cs.
 * Every lesson carries the skills it trains; a learner's profile is how many of those lessons they finished and how
 * they did on the quizzes of those lessons.
 */

/** The skill names (data, like the level titles in gamification.ts): the same words in every page and in the weekly email. */
export const SKILL_NAMES: Record<Skill, Text2> = {
  listening: { th: "การฟัง", en: "Listening" },
  speaking: { th: "การพูด", en: "Speaking" },
  reading: { th: "การอ่าน", en: "Reading" },
  writing: { th: "การเขียน", en: "Writing" },
  grammar: { th: "ไวยากรณ์", en: "Grammar" },
  vocabulary: { th: "คำศัพท์", en: "Vocabulary" },
};

export function skillProfile(lessons: Pick<Lesson, "id" | "published" | "skills">[], progress: Pick<LessonProgress, "lessonId" | "completed" | "quizScore" | "quizTotal">[]): SkillProfileRow[] {
  return SKILLS.map((skill) => {
    const ls = lessons.filter((l) => l.published && l.skills.includes(skill));
    const rows = ls.map((l) => progress.find((p) => p.lessonId === l.id)).filter((p): p is LessonProgress => !!p);
    const done = rows.filter((p) => p.completed).length;
    const quizCorrect = rows.reduce((n, p) => n + (p.quizScore ?? 0), 0);
    const quizTotal = rows.reduce((n, p) => n + (p.quizTotal ?? 0), 0);
    return {
      skill, lessonsDone: done, lessonsTotal: ls.length, quizCorrect, quizTotal,
      pct: ls.length > 0 ? Math.round((done / ls.length) * 100) : 0,
      accuracy: quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : null,
    };
  });
}

/** The best and the weakest skill among those with lessons; null when there is nothing to compare (or no difference). */
export function strongestWeakest(rows: SkillProfileRow[]): { strongest: Skill | null; weakest: Skill | null } {
  const live = rows.filter((r) => r.lessonsTotal > 0);
  if (live.length === 0) return { strongest: null, weakest: null };
  const score = (r: SkillProfileRow) => r.pct * 1000 + (r.accuracy ?? 0);
  const sorted = [...live].sort((a, b) => score(b) - score(a));
  const strongest = sorted[0], weakest = sorted[sorted.length - 1];
  if (live.length === 1 || score(strongest) === score(weakest)) return { strongest: strongest.skill, weakest: null };
  return { strongest: strongest.skill, weakest: weakest.skill };
}

/** The skills a program covers: the union over its lessons, in the canonical order. */
export function programSkills(lessons: Pick<Lesson, "skills" | "published">[]): Skill[] {
  const set = new Set(lessons.filter((l) => l.published).flatMap((l) => l.skills));
  return SKILLS.filter((s) => set.has(s));
}
