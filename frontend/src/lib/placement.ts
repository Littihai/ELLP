import { CEFR_LEVELS, type Cefr, type LevelScore, type PlacementQuestion, type PlacementTest, type Program, type SkillScore, type Track } from "@/types";
import { SKILLS } from "@/types";

/**
 * Placement rules (1.4, decision 0008), pure functions mirrored in backend Modules/Placement/PlacementRules.cs.
 * The test is a ladder: the person is placed at the highest CEFR level they pass when every lower level is passed too,
 * so one lucky hard answer cannot lift them, and one slip at the top does not drop them.
 */

/** A level is passed at 60 % or more of its questions. */
export const LEVEL_PASS_PCT = 60;
/** Programs recommended per result. */
export const MAX_RECOMMENDED = 3;

export const cefrIndex = (c: Cefr): number => CEFR_LEVELS.indexOf(c);

export interface PlacementScore { raw: number; total: number; byLevel: LevelScore[]; bySkill: SkillScore[]; cefr: Cefr }

export function scorePlacement(test: Pick<PlacementTest, "questions">, answers: Record<string, number>): PlacementScore {
  const right = (q: PlacementQuestion) => answers[q.id] === q.answer;
  const byLevel: LevelScore[] = CEFR_LEVELS
    .map((cefr) => ({ cefr, qs: test.questions.filter((q) => q.cefr === cefr) }))
    .filter((x) => x.qs.length > 0)
    .map((x) => ({ cefr: x.cefr, raw: x.qs.filter(right).length, total: x.qs.length }));
  const bySkill: SkillScore[] = SKILLS
    .map((skill) => ({ skill, qs: test.questions.filter((q) => q.skill === skill) }))
    .filter((x) => x.qs.length > 0)
    .map((x) => ({ skill: x.skill, raw: x.qs.filter(right).length, total: x.qs.length }));
  return { raw: test.questions.filter(right).length, total: test.questions.length, byLevel, bySkill, cefr: placeOnLadder(byLevel) };
}

/** The ladder: walk the levels from the lowest; the placement is the last level passed before the first one failed. pre-A1 when none. */
export function placeOnLadder(byLevel: LevelScore[]): Cefr {
  let placed: Cefr = "pre-A1";
  for (const level of [...byLevel].sort((a, b) => cefrIndex(a.cefr) - cefrIndex(b.cefr))) {
    if (level.total === 0) continue;
    if ((level.raw / level.total) * 100 >= LEVEL_PASS_PCT) placed = level.cefr; else break;
  }
  return placed;
}

/**
 * Which programs to suggest: published ones of the tenant at the placed level or one step above (the next challenge),
 * the person's track first when they have one and it has a match; otherwise the nearest levels. At most three.
 */
export function recommendPrograms(cefr: Cefr, programs: Pick<Program, "id" | "cefr" | "track" | "published" | "createdAt">[], track: Track | null): string[] {
  const pub = programs.filter((p) => p.published);
  const idx = cefrIndex(cefr);
  const dist = (p: { cefr: Cefr }) => cefrIndex(p.cefr) - idx;
  const pool = track && pub.some((p) => p.track === track) ? pub.filter((p) => p.track === track) : pub;
  const fit = pool.filter((p) => dist(p) === 0 || dist(p) === 1).sort((a, b) => dist(a) - dist(b) || a.createdAt.localeCompare(b.createdAt));
  const chosen = fit.length > 0 ? fit : [...pool].sort((a, b) => Math.abs(dist(a)) - Math.abs(dist(b)) || a.createdAt.localeCompare(b.createdAt));
  return chosen.slice(0, MAX_RECOMMENDED).map((p) => p.id);
}

/** What a visitor or learner receives: the test without its answer key. */
export function stripPlacementAnswers(t: PlacementTest): PlacementTest {
  return { ...t, questions: t.questions.map((q) => ({ ...q, answer: -1 })) };
}
