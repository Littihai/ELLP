import type { Lesson, Plan, Program, Track, UserProfile } from "@/types";

/**
 * Plan rules (1.1, decision 0005), pure functions mirrored in backend Modules/Access/PlanRules.cs.
 *  - a free program is open to everyone signed in
 *  - the first lesson of every program is a free preview
 *  - pro opens every lesson of the programs in the learner's chosen track that need pro or less
 *  - premium opens everything
 *  - a pending or expired plan counts as free
 *  - staff see everything
 */

export const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, premium: 2 };

export function effectivePlan(u: Pick<UserProfile, "plan" | "planStatus">): Plan {
  return u.planStatus === "active" ? u.plan : "free";
}

export function isPreviewLesson(lesson: Lesson, lessonsOfProgram: Lesson[]): boolean {
  const first = lessonsOfProgram.filter((l) => l.programId === lesson.programId).reduce<Lesson | null>((m, l) => (m === null || l.order < m.order ? l : m), null);
  return first?.id === lesson.id;
}

/** Can this learner open every lesson of the program (not only the preview)? */
export function planCoversProgram(u: Pick<UserProfile, "plan" | "planStatus" | "planTrack" | "role">, program: Pick<Program, "plan" | "track">): boolean {
  if (u.role !== "learner") return true;
  if (program.plan === "free") return true;
  const plan = effectivePlan(u);
  if (plan === "premium") return true;
  if (plan === "pro") return program.plan === "pro" && u.planTrack === program.track;
  return false;
}

export function canAccessLesson(
  u: Pick<UserProfile, "plan" | "planStatus" | "planTrack" | "role">,
  program: Pick<Program, "plan" | "track">,
  lesson: Lesson,
  lessonsOfProgram: Lesson[],
): boolean {
  return planCoversProgram(u, program) || isPreviewLesson(lesson, lessonsOfProgram);
}

/** The plan a learner would need for this program, for the paywall card. */
export function planNeeded(program: Pick<Program, "plan">): Plan {
  return program.plan;
}

/** Which track a pro request should carry: the one chosen, else the learner's own track. */
export function proTrackFor(requested: Track | null, u: Pick<UserProfile, "track">): Track | null {
  return requested ?? u.track;
}
