import type {
  Badge, InboxMessage, LeaderboardRow, Lesson, LessonProgress, MailLog, MessageReply, Owner, OwnerSettings, Program, Quest, QuestProgress,
  UserProfile, XpEvent,
} from "@/types";

/** What one learner activity (a watch mark or a quiz) earned, so the page can celebrate it. */
export interface ActivityResult {
  progress: LessonProgress;
  xpGained: number;
  events: { kind: XpEvent["kind"]; xp: number; note: string }[];
  levelBefore: number;
  levelAfter: number;
  newBadges: Badge[];
  questsCompleted: Quest[];
  lessonCompleted: boolean;
}

export interface AdminStats {
  learners: number;
  activeToday: number;
  programs: number;
  lessons: number;
  openMessages: number;
  xpThisWeek: number;
  completionsThisWeek: number;
  /** XP per day for the last 14 days, oldest first */
  xpByDay: { day: string; xp: number }[];
  topLessons: { lesson: Lesson; completions: number }[];
}

export type LeaderboardPeriod = "week" | "all";

/**
 * The one door between the pages and the data. Two implementations: `demoApi` (services/demoStore.ts, in-memory and
 * localStorage, no server) and `liveApi` (services/liveApi.ts, Firebase Auth + the C# API). `VITE_USE_DEMO` picks one.
 */
export interface EllpApi {
  readonly mode: "demo" | "live";
  // auth
  signIn(email: string, password: string): Promise<UserProfile>;
  signOut(): Promise<void>;
  currentUser(): Promise<UserProfile | null>;
  onAuthChange(cb: (u: UserProfile | null) => void): () => void;

  // catalog (what everybody may read)
  owners(): Promise<Owner[]>;
  programs(ownerId?: string | null): Promise<Program[]>;
  lessons(programId?: string | null): Promise<Lesson[]>;
  quests(ownerId: string): Promise<Quest[]>;
  badges(): Promise<Badge[]>;

  // learner
  myProgress(): Promise<LessonProgress[]>;
  myQuests(): Promise<QuestProgress[]>;
  myXpEvents(): Promise<XpEvent[]>;
  recordWatch(lessonId: string, watchedPct: number): Promise<ActivityResult>;
  submitQuiz(lessonId: string, answers: number[]): Promise<ActivityResult>;
  leaderboard(programId: string | null, period: LeaderboardPeriod): Promise<LeaderboardRow[]>;
  myMessages(): Promise<InboxMessage[]>;
  sendMessage(subject: string, body: string): Promise<InboxMessage>;
  enroll(programId: string): Promise<UserProfile>;

  // owner admin
  members(ownerId: string): Promise<UserProfile[]>;
  saveMember(u: UserProfile): Promise<UserProfile>;
  removeMember(uid: string): Promise<void>;
  saveProgram(p: Program): Promise<Program>;
  removeProgram(id: string): Promise<void>;
  saveLesson(l: Lesson): Promise<Lesson>;
  removeLesson(id: string): Promise<void>;
  saveQuest(q: Quest): Promise<Quest>;
  removeQuest(id: string): Promise<void>;
  inbox(ownerId: string): Promise<InboxMessage[]>;
  replyMessage(messageId: string, body: string): Promise<{ reply: MessageReply; mail: MailLog }>;
  setMessageStatus(messageId: string, status: InboxMessage["status"]): Promise<InboxMessage>;
  mailLog(ownerId: string): Promise<MailLog[]>;
  settings(ownerId: string): Promise<OwnerSettings>;
  saveSettings(s: OwnerSettings): Promise<OwnerSettings>;
  adminStats(ownerId: string | null): Promise<AdminStats>;

  // super admin
  saveOwner(o: Owner): Promise<Owner>;
  removeOwner(id: string): Promise<void>;
  resetDemo?(): Promise<void>;
}

export const USE_DEMO = (import.meta.env.VITE_USE_DEMO ?? "true") !== "false";
export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";
