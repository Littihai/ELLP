/**
 * ELLP domain types. The same shapes are stored in Firestore (collection per interface, see docs/data-model.md)
 * and returned by the C# API (backend/Ellp.Api/Modules/*Models.cs). Every text a learner reads is a { th, en } pair.
 */
export type Lang = "th" | "en";
export type Text2 = { th: string; en: string };

/** Who the person is on the platform (one role per account, scoped to an owner except the Super Admin). */
export type Role = "superadmin" | "owner" | "admin" | "learner";

export type StatusTone = "accent" | "ok" | "warn" | "stop" | "neutral";

/** Age bands (1.0.1): kindergarten, lower primary, upper primary, older. A learner's band comes from their birth year. */
export type AgeBand = "3-5" | "6-8" | "9-12" | "13+";

/** What changes per age band (tenant settings, decision 0004). */
export interface AgeRule {
  /** the quiz pass mark for this band */
  quizPassPct: number;
  /** whether learners of this band see the leaderboard */
  leaderboardVisible: boolean;
  /** a broken streak is not reset for this band (no punishment for young children) */
  streakFreeze: boolean;
}

/** A tenant: a school, a publisher or a family that owns programs and members. */
export interface Owner {
  id: string;
  code: string;
  name: Text2;
  contactEmail: string;
  plan: "free" | "school" | "enterprise";
  active: boolean;
  createdAt: string;
}

/** A teaching medium: one course made of ordered video lessons. */
export interface Program {
  id: string;
  ownerId: string;
  title: Text2;
  description: Text2;
  level: "beginner" | "elementary" | "intermediate";
  /** who the program is for; empty = every age */
  ageBands: AgeBand[];
  color: string;
  published: boolean;
  createdAt: string;
}

/** A condition a learner must meet before a lesson's video opens; every rule on a lesson must pass. */
export type UnlockRule =
  | { type: "lesson_completed"; lessonId: string }
  | { type: "min_level"; level: number }
  | { type: "min_xp"; xp: number }
  | { type: "quest_completed"; questId: string }
  | { type: "streak_days"; days: number }
  | { type: "min_age"; years: number }
  | { type: "age_band"; bands: AgeBand[] };

export interface QuizQuestion {
  id: string;
  prompt: Text2;
  choices: string[];
  answer: number;
}

export interface Lesson {
  id: string;
  programId: string;
  order: number;
  title: Text2;
  summary: Text2;
  /** YouTube video id (the part after v=). Admins paste it in the lesson form. */
  youtubeId: string;
  durationSec: number;
  xpReward: number;
  /** words the song teaches, shown as chips under the player */
  vocabulary: string[];
  quiz: QuizQuestion[];
  unlock: UnlockRule[];
  published: boolean;
}

export type QuestScope = "daily" | "weekly" | "program";
export type QuestGoalType = "watch_videos" | "pass_quizzes" | "earn_xp" | "streak_days";

export interface Quest {
  id: string;
  ownerId: string;
  /** null = every program of the owner */
  programId: string | null;
  scope: QuestScope;
  title: Text2;
  description: Text2;
  goal: { type: QuestGoalType; target: number };
  xpReward: number;
  badgeId: string | null;
  active: boolean;
}

export interface Badge {
  id: string;
  name: Text2;
  description: Text2;
  icon: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  /** null only for the Super Admin */
  ownerId: string | null;
  enrolledProgramIds: string[];
  /** the year only (the minimum needed for an age band); null = not given yet */
  birthYear: number | null;
  /** a teacher or parent opened every age band to this learner (override) */
  allowAllAges: boolean;
  /** a parent or guardian acknowledged the use of the platform (a first trace for PDPA; full consent flow comes with parent accounts) */
  parentConsent: { acknowledged: boolean; at: string | null; note: string };
  xp: number;
  streakDays: number;
  lastActiveDate: string | null;
  badgeIds: string[];
  avatarColor: string;
  active: boolean;
  createdAt: string;
}

export interface LessonProgress {
  uid: string;
  lessonId: string;
  watchedPct: number;
  completed: boolean;
  quizScore: number | null;
  quizTotal: number | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface QuestProgress {
  uid: string;
  questId: string;
  /** "2026-11-08" for daily, "2026-W45" for weekly, "all" for program quests */
  periodKey: string;
  progress: number;
  completed: boolean;
  completedAt: string | null;
}

/** A line in the learner's XP history (what the dashboard and the leaderboard add up). */
export interface XpEvent {
  id: string;
  uid: string;
  ownerId: string;
  programId: string | null;
  kind: "video" | "quiz" | "quest" | "streak" | "manual";
  xp: number;
  note: string;
  at: string;
}

export interface MessageReply {
  id: string;
  byUid: string;
  byName: string;
  body: string;
  at: string;
  mailId: string | null;
}

/** A learner's (or parent's) message to the owner's admins; the admins answer by email. */
export interface InboxMessage {
  id: string;
  ownerId: string;
  fromUid: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  status: "open" | "answered" | "closed";
  createdAt: string;
  replies: MessageReply[];
}

/** One email the platform sent (or would have sent in test mode): the admin's proof that a reply went out. */
export interface MailLog {
  id: string;
  ownerId: string;
  to: string;
  subject: string;
  body: string;
  status: "sent" | "redirected" | "failed" | "suppressed";
  testMode: boolean;
  at: string;
}

export interface OwnerSettings {
  ownerId: string;
  email: {
    fromName: string;
    fromAddress: string;
    replyTo: string;
    testMode: boolean;
    allowedRecipients: string[];
  };
  leaderboard: { visible: boolean; size: number };
  ageRules: Record<AgeBand, AgeRule>;
}

export interface LeaderboardRow {
  rank: number;
  uid: string;
  displayName: string;
  avatarColor: string;
  xp: number;
  level: number;
  isMe: boolean;
}
