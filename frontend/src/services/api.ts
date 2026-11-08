import type {
  Badge, Certificate, ChatThread, InboxMessage, LeaderboardRow, LearnerSession, Lesson, LessonProgress, MailLog, MessageReply, MockAttempt, MockTest, Owner,
  OwnerSettings, Payment, PaymentMethod, PaymentStatus, PlacementResult, PlacementTest, Plan, PlanStatus, Program, Quest, QuestProgress, SignUpInput, Track, UserProfile, Violation, ViolationType, WeeklyReport, XpEvent,
} from "@/types";
import type { SessionDecision } from "@/lib/integrity";

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
  pendingPlans: number;
  openChats: number;
  /** THB paid this calendar month (1.3) */
  revenueThisMonth: number;
  xpThisWeek: number;
  completionsThisWeek: number;
  /** XP per day for the last 14 days, oldest first */
  xpByDay: { day: string; xp: number }[];
  topLessons: { lesson: Lesson; completions: number }[];
}

export type LeaderboardPeriod = "week" | "all";

/** One child as the parent's page shows them (1.4): the week, the week before, the skill profile's inputs, placement and certificates. */
export interface ChildOverview {
  child: UserProfile;
  report: WeeklyReport;
  previous: WeeklyReport;
  programs: Program[];
  lessons: Lesson[];
  progress: LessonProgress[];
  xp: XpEvent[];
  placement: PlacementResult | null;
  certificates: Certificate[];
}

/** A program as the public catalog shows it: with its owner and a count, and the preview lesson. */
export interface PublicProgram {
  program: Program;
  owner: Owner;
  lessonCount: number;
  preview: Lesson | null;
}

/**
 * The one door between the pages and the data. Two implementations: `demoApi` (services/demoStore.ts, in-memory and
 * localStorage, no server) and `liveApi` (services/liveApi.ts, Firebase Auth + the C# API). `VITE_USE_DEMO` picks one.
 */
export interface EllpApi {
  readonly mode: "demo" | "live";
  // auth
  signIn(email: string, password: string): Promise<UserProfile>;
  signUp(input: SignUpInput): Promise<UserProfile>;
  signOut(): Promise<void>;
  currentUser(): Promise<UserProfile | null>;
  onAuthChange(cb: (u: UserProfile | null) => void): () => void;

  // public (no sign-in)
  publicOwners(): Promise<Owner[]>;
  publicPrograms(): Promise<PublicProgram[]>;
  publicProgram(programId: string): Promise<{ program: Program; owner: Owner; lessons: Lesson[]; settings: OwnerSettings } | null>;
  /** the chat of one visitor (by their browser key) or of the signed-in learner, with one tenant */
  chatThread(ownerId: string, visitorKey: string | null): Promise<ChatThread | null>;
  chatSend(ownerId: string, visitorKey: string | null, name: string, email: string, text: string): Promise<ChatThread>;
  // 1.4: the placement test is public (answers stripped); a visitor's result waits under their browser key until sign-up
  publicPlacementTest(ownerId: string): Promise<PlacementTest | null>;
  submitPlacement(ownerId: string, testId: string, answers: Record<string, number>, visitorKey: string | null): Promise<PlacementResult>;

  // catalog (what everybody signed in may read)
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
  /** 1.2, the platform's own player: the real position and played seconds; the percentage follows from the duration */
  recordPosition(lessonId: string, positionSec: number, watchedSec: number, durationSec: number): Promise<ActivityResult>;
  recordCheckpoint(lessonId: string, checkpointId: string, correct: boolean): Promise<ActivityResult>;
  recordReplay(lessonId: string): Promise<LessonProgress>;
  /** the URL the player loads: the stored URL in demo mode, a signed short-lived URL in live mode */
  videoUrl(lessonId: string): Promise<string>;
  reportViolation(lessonId: string | null, type: ViolationType, detail: string): Promise<{ violation: Violation; action: string; pausedUntil: string | null; strikes: number }>;
  startSession(deviceLabel: string): Promise<{ session: LearnerSession; decision: SessionDecision }>;
  heartbeat(sessionId: string): Promise<void>;
  endSession(sessionId: string): Promise<void>;
  submitQuiz(lessonId: string, answers: number[]): Promise<ActivityResult>;
  leaderboard(programId: string | null, period: LeaderboardPeriod): Promise<LeaderboardRow[]>;
  myMessages(): Promise<InboxMessage[]>;
  sendMessage(subject: string, body: string): Promise<InboxMessage>;
  enroll(programId: string): Promise<UserProfile>;
  requestPlan(plan: Plan, planTrack: Track | null, note: string): Promise<UserProfile>;
  // 1.3: payments, certificates, mock tests
  myPayments(): Promise<Payment[]>;
  /** a checkout: PromptPay / card through the tenant's gateway, or a transfer the admin confirms */
  createCheckout(plan: Plan, planTrack: Track | null, method: PaymentMethod, note: string): Promise<Payment>;
  /** demo gateway only: what the provider's webhook does in live mode */
  confirmDemoPayment(paymentId: string): Promise<Payment>;
  myCertificates(): Promise<Certificate[]>;
  issueCertificate(programId: string): Promise<Certificate>;
  verifyCertificate(code: string): Promise<Certificate | null>;
  mockTests(ownerId: string): Promise<MockTest[]>;
  startMockAttempt(testId: string): Promise<MockAttempt>;
  submitMockAttempt(attemptId: string, answers: Record<string, number>, timedOut: boolean): Promise<{ attempt: MockAttempt; result: ActivityResult }>;
  myMockAttempts(): Promise<MockAttempt[]>;
  // 1.4
  myPlacement(): Promise<PlacementResult | null>;
  /** parent accounts: the children, one child's overview for a week, the report by email, and the consent record */
  myChildren(): Promise<UserProfile[]>;
  childOverview(uid: string, weekKey: string): Promise<ChildOverview>;
  emailChildReport(uid: string, weekKey: string): Promise<MailLog>;
  confirmChildConsent(uid: string): Promise<UserProfile>;

  // owner admin
  members(ownerId: string): Promise<UserProfile[]>;
  saveMember(u: UserProfile): Promise<UserProfile>;
  removeMember(uid: string): Promise<void>;
  setMemberPlan(uid: string, plan: Plan, status: PlanStatus, planTrack: Track | null, note: string): Promise<UserProfile>;
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
  payments(ownerId: string): Promise<Payment[]>;
  setPaymentStatus(paymentId: string, status: Extract<PaymentStatus, "paid" | "refunded" | "failed">): Promise<Payment>;
  certificates(ownerId: string): Promise<Certificate[]>;
  saveMockTest(t: MockTest): Promise<MockTest>;
  removeMockTest(id: string): Promise<void>;
  mockAttempts(ownerId: string): Promise<MockAttempt[]>;
  placementTests(ownerId: string): Promise<PlacementTest[]>;
  savePlacementTest(t: PlacementTest): Promise<PlacementTest>;
  removePlacementTest(id: string): Promise<void>;
  placementResults(ownerId: string): Promise<PlacementResult[]>;
  /** mails this week's report to every parent of the tenant (test-mode guard applies); returns what went out */
  sendWeeklyReports(ownerId: string): Promise<MailLog[]>;
  violations(ownerId: string): Promise<Violation[]>;
  sessions(ownerId: string): Promise<LearnerSession[]>;
  liftPause(uid: string, lessonId: string): Promise<void>;
  chatThreads(ownerId: string): Promise<ChatThread[]>;
  chatReply(threadId: string, text: string): Promise<ChatThread>;
  chatSetStatus(threadId: string, status: ChatThread["status"], linkedUid?: string | null): Promise<ChatThread>;

  // super admin
  saveOwner(o: Owner): Promise<Owner>;
  removeOwner(id: string): Promise<void>;
  resetDemo?(): Promise<void>;
}

export const USE_DEMO = (import.meta.env.VITE_USE_DEMO ?? "true") !== "false";
export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

/** The id of this tab's learner session (sessionStorage: a second tab is a second session, as the limit intends). */
export const SESSION_KEY = "ellp.session";
export function readSessionId(): string | null { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } }
export function writeSessionId(id: string | null) { try { if (id) sessionStorage.setItem(SESSION_KEY, id); else sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } }

/** The visitor's chat key, kept in this browser so a chat begun before sign-up is found again. */
export function visitorKey(): string {
  const K = "ellp.visitor";
  try {
    let v = localStorage.getItem(K);
    if (!v) { v = "v_" + Math.random().toString(36).slice(2, 12); localStorage.setItem(K, v); }
    return v;
  } catch {
    return "v_session";
  }
}
