/**
 * ELLP domain types. The same shapes are stored in Firestore (collection per interface, see docs/data-model.md)
 * and returned by the C# API (backend/Ellp.Api/Modules/*Models.cs). Every text a learner reads is a { th, en } pair.
 */
export type Lang = "th" | "en";
export type Text2 = { th: string; en: string };

/** Who the person is on the platform (one role per account, scoped to an owner except the Super Admin). */
export type Role = "superadmin" | "owner" | "admin" | "learner" | "parent";

export type StatusTone = "accent" | "ok" | "warn" | "stop" | "neutral";

/** Age bands (1.0.1, widened in 1.1): kindergarten, lower and upper primary, lower and upper secondary, adults. From the birth year. */
export type AgeBand = "3-5" | "6-8" | "9-12" | "13-15" | "16-18" | "18+";

/** What a learner is here for (1.1, decision 0005). A program belongs to one track; a learner picks one at sign-up. */
export type Track = "kids" | "school" | "toeic" | "ielts" | "kpo" | "foundation";
export const TRACKS: Track[] = ["kids", "school", "toeic", "ielts", "kpo", "foundation"];

/** CEFR level of a program (pre-A1 for the youngest). */
export type Cefr = "pre-A1" | "A1" | "A2" | "B1" | "B2" | "C1";
export const CEFR_LEVELS: Cefr[] = ["pre-A1", "A1", "A2", "B1", "B2", "C1"];

/** Skills a lesson trains and a placement test measures (1.4, decision 0008). */
export type Skill = "listening" | "speaking" | "reading" | "writing" | "grammar" | "vocabulary";
export const SKILLS: Skill[] = ["listening", "speaking", "reading", "writing", "grammar", "vocabulary"];

/** Plans (1.1): free = catalog + the first lesson of every program; pro = every lesson of one track; premium = everything. */
export type Plan = "free" | "pro" | "premium";
export const PLANS: Plan[] = ["free", "pro", "premium"];
export type PlanStatus = "active" | "pending" | "expired";

// ── 1.4 (decision 0008): placement test, skill profile, parent accounts and weekly reports ──

/** One placement question: tagged with the skill it measures and the CEFR level it sits at. */
export interface PlacementQuestion { id: string; skill: Skill; cefr: Cefr; prompt: Text2; choices: string[]; answer: number }

/** A tenant's placement test. Public (answers stripped); the result places the person at a CEFR level and recommends programs. */
export interface PlacementTest {
  id: string;
  ownerId: string;
  title: Text2;
  description: Text2;
  questions: PlacementQuestion[];
  published: boolean;
}

export interface SkillScore { skill: Skill; raw: number; total: number }
export interface LevelScore { cefr: Cefr; raw: number; total: number }

/** What a placement test said about one person: a visitor (by browser key, linked at sign-up) or a learner. */
export interface PlacementResult {
  id: string;
  ownerId: string;
  testId: string;
  uid: string | null;
  visitorKey: string | null;
  answers: Record<string, number>;
  raw: number;
  total: number;
  byLevel: LevelScore[];
  bySkill: SkillScore[];
  /** the estimated level: the highest level passed with every lower level passed too */
  cefr: Cefr;
  recommendedProgramIds: string[];
  submittedAt: string;
}

/** How far a learner is in one skill, from the lessons tagged with it. */
export interface SkillProfileRow {
  skill: Skill;
  lessonsDone: number;
  lessonsTotal: number;
  quizCorrect: number;
  quizTotal: number;
  /** lessons done over lessons available, 0–100 */
  pct: number;
  /** quiz answers right over answered, 0–100; null before any quiz */
  accuracy: number | null;
}

/** One child's week, as the parent reads it (and as the weekly email says it). */
export interface WeeklyReport {
  uid: string;
  weekKey: string;
  from: string;
  to: string;
  xp: number;
  lessonsDone: number;
  quizzesPassed: number;
  activeDays: number;
  minutes: number;
  level: number;
  streakDays: number;
  skills: SkillProfileRow[];
  strongest: Skill | null;
  weakest: Skill | null;
  /** a few plain sentences built from the numbers (rule-based; a language model may write them later) */
  summary: Text2;
}

// ── 1.3 (decision 0007): payments, certificates, mock tests ──
export type PaymentMethod = "promptpay" | "card" | "transfer";
export type PaymentProvider = "demo" | "omise" | "manual";
export type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "refunded";

export interface Pricing { pro: number; premium: number; currency: "THB"; months: number }

/** One attempt to pay for a plan: through the gateway (PromptPay / card) or by a transfer an admin confirms. */
export interface Payment {
  id: string;
  uid: string;
  ownerId: string;
  plan: Plan;
  planTrack: Track | null;
  amount: number;
  currency: "THB";
  months: number;
  method: PaymentMethod;
  provider: PaymentProvider;
  status: PaymentStatus;
  /** the provider's charge id, or the transfer reference the learner typed */
  reference: string;
  /** the PromptPay payload the QR shows (demo: a fake one) */
  qrPayload: string | null;
  receiptNo: string | null;
  note: string;
  createdAt: string;
  paidAt: string | null;
}

/** A course certificate; `code` is what a parent or employer verifies on /certificate/{code}. */
export interface Certificate {
  id: string;
  code: string;
  uid: string;
  learnerName: string;
  ownerId: string;
  ownerName: Text2;
  programId: string;
  programTitle: Text2;
  track: Track;
  cefr: Cefr;
  lessons: number;
  xpEarned: number;
  issuedAt: string;
}

export type MockScoring = "toeic" | "ielts" | "percent";
export interface MockQuestion { id: string; prompt: Text2; choices: string[]; answer: number }
export interface MockSection { id: string; title: Text2; questions: MockQuestion[] }

/** A timed practice exam: sections of questions, a clock, and a score in the exam's own scale. */
export interface MockTest {
  id: string;
  ownerId: string;
  track: Track;
  title: Text2;
  description: Text2;
  durationMin: number;
  scoring: MockScoring;
  /** the pass mark in the scale: TOEIC score, IELTS band, or percent */
  passMark: number;
  requiredPlan: Plan;
  sections: MockSection[];
  published: boolean;
}

export interface MockAttempt {
  id: string;
  uid: string;
  testId: string;
  ownerId: string;
  startedAt: string;
  submittedAt: string | null;
  answers: Record<string, number>;
  raw: number;
  total: number;
  sectionScores: { sectionId: string; raw: number; total: number }[];
  scaled: number;
  scaledLabel: string;
  passed: boolean;
  timedOut: boolean;
}

/** How strictly a program's player behaves (1.2, decision 0006): off for songs, standard for foundations, strict for exams. */
export type ProctoringProfile = "off" | "standard" | "strict";
export const PROFILES: ProctoringProfile[] = ["off", "standard", "strict"];

/** What the tenant decides about the integrity ladder and limits. */
export interface IntegrityPolicy {
  /** the n-th attention violation in a lesson pauses it (1 and 2 warn) */
  pauseAfterViolations: number;
  pauseMinutes: number;
  /** sessions a learner may hold at once */
  maxSessions: number;
  /** completed plays of one video; 0 = unlimited */
  maxReplays: number;
  checkpointTimeLimitSec: number;
  /** XP for a right in-video answer */
  checkpointXp: number;
}

export type ViolationType = "tab_switch" | "window_blur" | "fullscreen_exit" | "seek_attempt" | "speed_attempt" | "pause_spam" | "duplicate_session" | "checkpoint_timeout" | "replay_limit";

export interface Violation {
  id: string;
  uid: string;
  ownerId: string;
  lessonId: string | null;
  type: ViolationType;
  /** what the ladder did: logged | warned | paused | kicked_old | refused */
  action: string;
  detail: string;
  at: string;
}

/** One signed-in device/tab of a learner; a heartbeat keeps it alive. */
export interface LearnerSession {
  id: string;
  uid: string;
  deviceLabel: string;
  startedAt: string;
  lastSeenAt: string;
  active: boolean;
}

/** An in-video question: the video pauses at `atSec` and resumes once answered (or the time runs out). */
export interface Checkpoint {
  id: string;
  atSec: number;
  prompt: Text2;
  choices: string[];
  answer: number;
}

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
  track: Track;
  cefr: Cefr;
  /** for exam tracks: the score the program aims at ("TOEIC 600", "IELTS 6.5"); empty otherwise */
  targetScore: string;
  /** the lowest plan that opens every lesson; the first lesson is always a free preview */
  plan: Plan;
  /** null = the track's default (lib/integrity.ts defaultProfileFor) */
  proctoring: ProctoringProfile | null;
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
  /** a self-hosted video (mp4 / HLS) the platform's own player controls; when set it wins over youtubeId (1.2) */
  videoUrl: string;
  checkpoints: Checkpoint[];
  durationSec: number;
  xpReward: number;
  /** words the song teaches, shown as chips under the player */
  vocabulary: string[];
  /** the skills this lesson trains (1.4); the skill profile and the weekly report add them up */
  skills: Skill[];
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
  /** what the learner is here for; null until chosen */
  track: Track | null;
  plan: Plan;
  /** pending = a pro/premium request waits for an admin (bank transfer + slip in 1.1); expired = the admin ended it */
  planStatus: PlanStatus;
  /** the one track a pro plan covers */
  planTrack: Track | null;
  /** what the learner wrote with the request (slip reference, school, phone) and what the admin noted back */
  planNote: string;
  planRequestedAt: string | null;
  /** when a paid plan ends (1.3); null for free or not yet paid */
  planExpiresAt: string | null;
  /** a teacher or parent opened every age band to this learner (override) */
  allowAllAges: boolean;
  /** 1.4: a parent account's children; empty for everyone else */
  childUids: string[];
  /** 1.4: the level the placement test estimated and when; null until taken */
  placementCefr: Cefr | null;
  placementAt: string | null;
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
  /** 1.2: seconds really played, the last position, completed plays, answered checkpoints and a pause set by the ladder */
  watchedSec: number;
  lastPositionSec: number;
  replays: number;
  checkpointResults: Record<string, boolean>;
  pausedUntil: string | null;
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
  /** the tenant's LINE Official Account link shown next to the chat (empty = no button) */
  lineUrl: string;
  /** what a visitor reads under "how to pay" when requesting a plan */
  paymentInstructions: Text2;
  integrity: IntegrityPolicy;
  pricing: Pricing;
  /** demo (the simulated gateway) | omise (Opn Payments, keys on the server) | manual (transfer + slip only) */
  paymentProvider: PaymentProvider;
}

/** A chat between a visitor (not signed in yet) or a learner and the tenant's admins (1.1). */
export interface ChatMessage {
  id: string;
  from: "visitor" | "admin";
  byName: string;
  text: string;
  at: string;
}

export interface ChatThread {
  id: string;
  ownerId: string;
  /** the learner's uid once signed in, else null */
  uid: string | null;
  /** a random key kept in the visitor's browser, so the thread survives a reload before sign-up */
  visitorKey: string | null;
  name: string;
  email: string;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  /** set when an admin created an account from this chat */
  linkedUid: string | null;
  messages: ChatMessage[];
}

/** What a visitor fills in on the sign-up page (1.1). */
export interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
  birthYear: number | null;
  track: Track;
  ownerId: string;
  plan: Plan;
  planTrack: Track | null;
  note: string;
  /** the browser key, so a chat or a placement result made before sign-up follows the person into the account */
  visitorKey: string | null;
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
