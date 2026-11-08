import type { IntegrityPolicy, Lesson, LessonProgress, ProctoringProfile, Track, ViolationType } from "@/types";

/**
 * Learning-integrity rules (1.2, decision 0006), pure functions mirrored in backend Modules/Integrity/IntegrityRules.cs.
 * A program's proctoring profile says which player rules are on; the tenant's policy says the numbers and the ladder.
 */

/** What each profile switches on. "off" is the kids' songs; "strict" the exam tracks. */
export interface ProfileRules {
  trackAttention: boolean;   // tab / window / fullscreen events are recorded
  punishAttention: boolean;  // ... and count toward a pause (standard only logs)
  blockSeek: boolean;
  lockSpeed: boolean;
  requireFullscreen: boolean;
  checkpoints: boolean;
  replayLimit: boolean;
  sessionLimit: boolean;
  watermark: boolean;
  noCopy: boolean;
}

export const PROFILE_RULES: Record<ProctoringProfile, ProfileRules> = {
  off: { trackAttention: false, punishAttention: false, blockSeek: false, lockSpeed: false, requireFullscreen: false, checkpoints: false, replayLimit: false, sessionLimit: false, watermark: false, noCopy: false },
  standard: { trackAttention: true, punishAttention: false, blockSeek: true, lockSpeed: true, requireFullscreen: false, checkpoints: true, replayLimit: false, sessionLimit: true, watermark: false, noCopy: false },
  strict: { trackAttention: true, punishAttention: true, blockSeek: true, lockSpeed: true, requireFullscreen: true, checkpoints: true, replayLimit: true, sessionLimit: true, watermark: true, noCopy: true },
};

/** The profile a track gets unless the program says otherwise. */
export function defaultProfileFor(track: Track): ProctoringProfile {
  return track === "kids" ? "off" : track === "foundation" ? "standard" : "strict";
}

/** The owner's ladder as defaults: warn, warn, pause; sessions: warn, end the old one, refuse the new one. */
export const DEFAULT_POLICY: IntegrityPolicy = {
  pauseAfterViolations: 3,
  pauseMinutes: 10,
  maxSessions: 1,
  maxReplays: 3,
  checkpointTimeLimitSec: 60,
  checkpointXp: 10,
};

/** Attention events that climb the ladder; the others are only recorded. */
export const ATTENTION_TYPES: ViolationType[] = ["tab_switch", "window_blur", "fullscreen_exit"];

export type LadderAction = "logged" | "warned" | "paused";

/**
 * The ladder for one attention event: the n-th strike in this lesson (1-based) is a warning until the threshold, where the lesson
 * is paused. A profile that does not punish only logs.
 */
export function ladderAction(strikeNumber: number, policy: IntegrityPolicy, punish: boolean): LadderAction {
  if (!punish) return "logged";
  return strikeNumber >= policy.pauseAfterViolations ? "paused" : "warned";
}

export type SessionDecision = "allow" | "warn" | "kick_old" | "refuse";

/**
 * A new session while others are active: the first time a warning (both stay), the second time the old session is ended,
 * from the third time on the new session is refused. `priorDuplicates` counts the duplicate-session events of this learner.
 */
export function sessionDecision(activeOthers: number, priorDuplicates: number, maxSessions: number): SessionDecision {
  if (activeOthers < Math.max(1, maxSessions)) return "allow";
  if (priorDuplicates === 0) return "warn";
  if (priorDuplicates === 1) return "kick_old";
  return "refuse";
}

/** A session is alive when its heartbeat is recent. */
export const SESSION_TTL_SEC = 90;
export function sessionAlive(lastSeenIso: string, nowMs = Date.now()): boolean {
  return nowMs - new Date(lastSeenIso).getTime() < SESSION_TTL_SEC * 1000;
}

/** Whether the lesson is on pause for this learner right now. */
export function isPaused(p: LessonProgress | undefined, nowMs = Date.now()): boolean {
  return !!p?.pausedUntil && new Date(p.pausedUntil).getTime() > nowMs;
}

/** Can the learner start the video again? Replays count completed plays; 0 = unlimited. */
export function replayAllowed(p: LessonProgress | undefined, policy: IntegrityPolicy, enforce: boolean): boolean {
  if (!enforce || policy.maxReplays <= 0) return true;
  return (p?.replays ?? 0) < policy.maxReplays;
}

/** Seeking forward is allowed up to the furthest second already watched (plus a second of slack). */
export function seekAllowed(target: number, furthest: number, block: boolean): boolean {
  return !block || target <= furthest + 1;
}

/** The checkpoint due at this position, if any was not yet answered. */
export function dueCheckpoint(lesson: Lesson, positionSec: number, answered: string[]) {
  return lesson.checkpoints.filter((c) => !answered.includes(c.id) && positionSec >= c.atSec).sort((a, b) => a.atSec - b.atSec)[0] ?? null;
}
