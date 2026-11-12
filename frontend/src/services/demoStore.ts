import type {
  Badge, Certificate, ChatThread, InboxMessage, LeaderboardRow, LearnerSession, Lesson, LessonProgress, MailLog, MessageReply, MockAttempt, MockTest, Owner,
  OwnerSettings, Payment, PaymentMethod, PlacementResult, PlacementTest, Plan, PlanStatus, Program, Quest, QuestProgress, SignUpInput, Track, UserProfile, Violation, ViolationType, XpEvent,
} from "@/types";
import { recommendPrograms, scorePlacement, stripPlacementAnswers } from "@/lib/placement";
import { buildWeeklyReport, canViewChild, recentWeeks } from "@/lib/family";
import { DEFAULT_PRICING, MOCK_XP_DONE, MOCK_XP_PASS, certificateCode, demoQrPayload, expiryStatus, planExpiry, priceFor, programComplete, receiptNo, scoreMock } from "@/lib/commerce";
import { PLAN_RANK, effectivePlan } from "@/lib/access";
import { ATTENTION_TYPES, DEFAULT_POLICY, PROFILE_RULES, defaultProfileFor, ladderAction, sessionAlive, sessionDecision, type SessionDecision } from "@/lib/integrity";
import { readSessionId, writeSessionId } from "./api";
import {
  BADGES, CERTIFICATES, CHATS, DEMO_PASSWORD, LESSONS, MAIL_LOG, MESSAGES, MOCK_ATTEMPTS, MOCK_TESTS, OWNERS, OWNER_SETTINGS, PAYMENTS, PLACEMENT_RESULTS, PLACEMENT_TESTS, PROGRAMS, PROGRESS, QUESTS,
  QUEST_PROGRESS, USERS, XP_EVENTS,
} from "@/data/seed";
import { canAccessLesson } from "@/lib/access";
import {
  DEFAULT_AGE_RULES, WATCH_COMPLETE_PCT, ageRuleFor, dayKey, levelFor, lessonComplete, nextStreak, periodKeyFor, quizPassed, quizXp, streakBonus, weekKey,
} from "@/lib/gamification";
import { newId, nowIso } from "@/lib/format";
import type { ActivityResult, AdminStats, ChildOverview, EllpApi, LeaderboardPeriod, PublicProgram } from "./api";

/**
 * The demo back end: every collection in one object, saved to localStorage after each change, so a visitor can click
 * through the whole platform (learner and admin) without Firebase or the API, and their progress survives a reload.
 * The gamification happens here with the same rules as the server (lib/gamification.ts).
 */
interface State {
  owners: Owner[];
  programs: Program[];
  lessons: Lesson[];
  quests: Quest[];
  badges: Badge[];
  users: UserProfile[];
  progress: LessonProgress[];
  questProgress: QuestProgress[];
  xpEvents: XpEvent[];
  messages: InboxMessage[];
  mail: MailLog[];
  settings: OwnerSettings[];
  chats: ChatThread[];
  violations: Violation[];
  sessions: LearnerSession[];
  payments: Payment[];
  certificates: Certificate[];
  mockTests: MockTest[];
  mockAttempts: MockAttempt[];
  placementTests: PlacementTest[];
  placementResults: PlacementResult[];
  /** receipt counters per tenant and year, "own_pro:2026" → 1 */
  receiptSeq: Record<string, number>;
  /** passwords of accounts created on the sign-up page (seeded accounts all use DEMO_PASSWORD) */
  passwords: Record<string, string>;
  sessionUid: string | null;
}

// v8: the seed carries no videos and shorter parent names; an older saved state is replaced by a fresh seed
const KEY = "ellp.demo.v8";

function seed(): State {
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
  return {
    owners: clone(OWNERS), programs: clone(PROGRAMS), lessons: clone(LESSONS), quests: clone(QUESTS), badges: clone(BADGES), users: clone(USERS),
    progress: clone(PROGRESS), questProgress: clone(QUEST_PROGRESS), xpEvents: clone(XP_EVENTS), messages: clone(MESSAGES), mail: clone(MAIL_LOG),
    settings: clone(OWNER_SETTINGS), chats: clone(CHATS), violations: [], sessions: [], payments: clone(PAYMENTS), certificates: clone(CERTIFICATES), mockTests: clone(MOCK_TESTS), mockAttempts: clone(MOCK_ATTEMPTS), placementTests: clone(PLACEMENT_TESTS), placementResults: clone(PLACEMENT_RESULTS), receiptSeq: { "own_pro:2026": 1, "own_sunshine:2026": 1 }, passwords: {}, sessionUid: null,
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      if (s && Array.isArray(s.users)) return s;
    }
  } catch { /* fall through to a fresh seed */ }
  return seed();
}

const delay = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms));

class DemoStore implements EllpApi {
  readonly mode = "demo" as const;
  private s: State = load();
  private listeners = new Set<(u: UserProfile | null) => void>();

  private save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage full or blocked: the session still works */ }
  }
  private me(): UserProfile {
    const u = this.s.users.find((x) => x.uid === this.s.sessionUid);
    if (!u) throw new Error("NOT_SIGNED_IN");
    return u;
  }
  private emit() { const u = this.s.users.find((x) => x.uid === this.s.sessionUid) ?? null; this.listeners.forEach((cb) => cb(u)); }

  // ── auth ──
  async signIn(email: string, password: string): Promise<UserProfile> {
    await delay(350);
    this.expirePlans();
    const u = this.s.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    const expected = u ? (this.s.passwords[u.uid] ?? DEMO_PASSWORD) : DEMO_PASSWORD;
    if (!u || password !== expected) throw new Error("INVALID_CREDENTIALS");
    if (!u.active) throw new Error("ACCOUNT_DISABLED");
    this.s.sessionUid = u.uid;
    if (u.role === "learner") this.openSession(u, "sign-in");   // may throw SESSION_REFUSED
    this.save(); this.emit();
    return structuredClone(u);
  }

  // ── sessions (1.2): one learner, a limited number of live tabs/devices; the ladder warns, ends the old one, then refuses ──
  private policyOf(ownerId: string | null) { return this.s.settings.find((x) => x.ownerId === ownerId)?.integrity ?? DEFAULT_POLICY; }
  private liveSessions(uid: string) { return this.s.sessions.filter((x) => x.uid === uid && x.active && sessionAlive(x.lastSeenAt)); }
  private openSession(u: UserProfile, deviceLabel: string): { session: LearnerSession; decision: SessionDecision } {
    const mine = readSessionId();
    const existing = mine ? this.s.sessions.find((x) => x.id === mine && x.uid === u.uid && x.active) : undefined;
    if (existing) { existing.lastSeenAt = nowIso(); return { session: structuredClone(existing), decision: "allow" }; }
    const others = this.liveSessions(u.uid);
    const prior = this.s.violations.filter((v) => v.uid === u.uid && v.type === "duplicate_session").length;
    const decision = sessionDecision(others.length, prior, this.policyOf(u.ownerId).maxSessions);
    if (decision !== "allow") {
      this.s.violations.unshift({ id: newId("vio"), uid: u.uid, ownerId: u.ownerId ?? "", lessonId: null, type: "duplicate_session", action: decision === "warn" ? "warned" : decision === "kick_old" ? "kicked_old" : "refused", detail: `${others.length} other live session(s); ${deviceLabel}`, at: nowIso() });
      if (decision === "refuse") { this.s.sessionUid = null; this.save(); throw new Error("SESSION_REFUSED"); }
      if (decision === "kick_old") for (const o of others) o.active = false;
    }
    const session: LearnerSession = { id: newId("ses"), uid: u.uid, deviceLabel, startedAt: nowIso(), lastSeenAt: nowIso(), active: true };
    this.s.sessions.unshift(session);
    writeSessionId(session.id);
    return { session: structuredClone(session), decision };
  }
  async startSession(deviceLabel: string) { const me = this.me(); const r = this.openSession(me, deviceLabel); this.save(); return r; }
  async heartbeat(sessionId: string) {
    const x = this.s.sessions.find((s) => s.id === sessionId);
    if (!x) return;
    if (!x.active) { writeSessionId(null); this.s.sessionUid = null; this.save(); this.emit(); throw new Error("SESSION_ENDED"); }
    x.lastSeenAt = nowIso(); this.save();
  }
  async endSession(sessionId: string) { const x = this.s.sessions.find((s) => s.id === sessionId); if (x) x.active = false; writeSessionId(null); this.save(); }
  async signOut() {
    const mine = readSessionId();
    const x = mine ? this.s.sessions.find((s) => s.id === mine) : undefined;
    if (x) x.active = false;
    writeSessionId(null);
    this.s.sessionUid = null; this.save(); this.emit();
  }

  /** The sign-up page: a learner account under the chosen tenant; a pro/premium wish becomes a pending request for the admin. */
  async signUp(input: SignUpInput): Promise<UserProfile> {
    await delay(400);
    const email = input.email.trim().toLowerCase();
    if (!email || !input.password || input.password.length < 6) throw new Error("VALIDATION");
    if (this.s.users.some((x) => x.email.toLowerCase() === email)) throw new Error("EMAIL_TAKEN");
    if (!this.s.owners.some((o) => o.id === input.ownerId && o.active)) throw new Error("OWNER_NOT_FOUND");
    const wantsPaid = input.plan !== "free";
    const u: UserProfile = {
      uid: newId("u"), displayName: input.displayName.trim() || email, email, role: "learner", ownerId: input.ownerId, enrolledProgramIds: [],
      birthYear: input.birthYear, track: input.track, allowAllAges: false, parentConsent: { acknowledged: false, at: null, note: "" }, childUids: [], placementCefr: null, placementAt: null,
      plan: input.plan, planStatus: wantsPaid ? "pending" : "active", planTrack: input.plan === "pro" ? (input.planTrack ?? input.track) : null,
      planNote: input.note.trim(), planRequestedAt: wantsPaid ? nowIso() : null, planExpiresAt: null,
      xp: 0, streakDays: 0, lastActiveDate: null, badgeIds: [], avatarColor: ["#066fd1", "#2f7f86", "#b0566f", "#a8612a", "#6b5fb0"][Math.floor(Math.random() * 5)], active: true, createdAt: nowIso(),
    };
    // the free programs of the learner's track (and the foundation ones) are joined at once, so the home page has something to show
    u.enrolledProgramIds = this.s.programs.filter((p) => p.ownerId === u.ownerId && p.published && (p.track === u.track || p.track === "foundation")).map((p) => p.id);
    this.s.users.push(u);
    this.s.passwords[u.uid] = input.password;
    // a chat or a placement result made as a visitor follows the person into their account
    const vk = input.visitorKey ?? (() => { try { return localStorage.getItem("ellp.visitor"); } catch { return null; } })();
    for (const c of this.s.chats) if (vk && c.visitorKey === vk && c.ownerId === u.ownerId && !c.uid) { c.uid = u.uid; c.email = u.email; c.name = u.displayName; }
    for (const r of this.s.placementResults) if (vk && r.visitorKey === vk && r.ownerId === u.ownerId && !r.uid) { r.uid = u.uid; r.visitorKey = null; u.placementCefr = r.cefr; u.placementAt = r.submittedAt; }
    this.s.sessionUid = u.uid;
    this.save(); this.emit();
    return structuredClone(u);
  }

  // ── public (no sign-in) ──
  async publicOwners() { return structuredClone(this.s.owners.filter((o) => o.active)); }
  async publicPrograms(): Promise<PublicProgram[]> {
    const owners = this.s.owners.filter((o) => o.active);
    return this.s.programs.filter((p) => p.published && owners.some((o) => o.id === p.ownerId)).map((program) => {
      const ls = this.s.lessons.filter((l) => l.programId === program.id && l.published).sort((a, b) => a.order - b.order);
      return { program: structuredClone(program), owner: structuredClone(owners.find((o) => o.id === program.ownerId)!), lessonCount: ls.length, preview: ls[0] ? structuredClone(ls[0]) : null };
    });
  }
  async publicProgram(programId: string) {
    const program = this.s.programs.find((p) => p.id === programId && p.published);
    const owner = program && this.s.owners.find((o) => o.id === program.ownerId && o.active);
    if (!program || !owner) return null;
    return { program: structuredClone(program), owner: structuredClone(owner), lessons: structuredClone(this.s.lessons.filter((l) => l.programId === programId && l.published).sort((a, b) => a.order - b.order)), settings: await this.settings(owner.id) };
  }
  private findChat(ownerId: string, visitorKey: string | null): ChatThread | undefined {
    const uid = this.s.sessionUid;
    return this.s.chats.find((c) => c.ownerId === ownerId && c.status === "open" && ((uid && c.uid === uid) || (visitorKey && c.visitorKey === visitorKey)));
  }
  async chatThread(ownerId: string, visitorKey: string | null) { const c = this.findChat(ownerId, visitorKey); return c ? structuredClone(c) : null; }
  async chatSend(ownerId: string, visitorKey: string | null, name: string, email: string, text: string): Promise<ChatThread> {
    await delay(150);
    const me = this.s.users.find((x) => x.uid === this.s.sessionUid) ?? null;
    let c = this.findChat(ownerId, visitorKey);
    if (!c) {
      c = { id: newId("chat"), ownerId, uid: me?.uid ?? null, visitorKey: me ? null : visitorKey, name: me?.displayName ?? name.trim(), email: me?.email ?? email.trim(), status: "open", linkedUid: null, createdAt: nowIso(), updatedAt: nowIso(), messages: [] };
      this.s.chats.unshift(c);
    }
    c.messages.push({ id: newId("cm"), from: "visitor", byName: c.name, text: text.trim(), at: nowIso() });
    c.updatedAt = nowIso();
    this.save();
    return structuredClone(c);
  }
  async currentUser() { this.expirePlans(); const u = this.s.users.find((x) => x.uid === this.s.sessionUid); return u ? structuredClone(u) : null; }

  /** 1.3: a paid plan past its end becomes expired; one that ends within a week gets one reminder email (through the test-mode guard). */
  private expirePlans() {
    let changed = false;
    for (const u of this.s.users) {
      if (u.role !== "learner" || u.plan === "free" || u.planStatus !== "active") continue;
      const st = expiryStatus(u.planExpiresAt);
      if (st === "expired") { u.planStatus = "expired"; changed = true; }
      if (st === "expiring") {
        const subject = `แพ็กเกจ ${u.plan} ใกล้หมดอายุ (${u.planExpiresAt?.slice(0, 10)})`;
        if (!this.s.mail.some((m) => m.to === u.email && m.subject === subject)) {
          const cfg = this.s.settings.find((x) => x.ownerId === u.ownerId)?.email;
          const status: MailLog["status"] = cfg?.testMode === false ? "sent" : (cfg?.allowedRecipients ?? []).length ? "redirected" : "suppressed";
          this.s.mail.unshift({ id: newId("mail"), ownerId: u.ownerId ?? "", to: u.email, subject, body: `แพ็กเกจ ${u.plan} ของคุณจะหมดอายุในอีกไม่กี่วัน ต่ออายุได้ที่หน้าแพ็กเกจ`, status, testMode: cfg?.testMode ?? true, at: nowIso() });
          changed = true;
        }
      }
    }
    if (changed) this.save();
  }
  onAuthChange(cb: (u: UserProfile | null) => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }

  // ── catalog ──
  async owners() { return structuredClone(this.s.owners); }
  async programs(ownerId?: string | null) { return structuredClone(this.s.programs.filter((p) => !ownerId || p.ownerId === ownerId)); }
  async lessons(programId?: string | null) {
    return structuredClone(this.s.lessons.filter((l) => !programId || l.programId === programId).sort((a, b) => a.order - b.order));
  }
  async quests(ownerId: string) { return structuredClone(this.s.quests.filter((q) => q.ownerId === ownerId)); }
  async badges() { return structuredClone(this.s.badges); }

  // ── learner ──
  async myProgress() { const me = this.me(); return structuredClone(this.s.progress.filter((p) => p.uid === me.uid)); }
  async myQuests() { const me = this.me(); return structuredClone(this.s.questProgress.filter((p) => p.uid === me.uid)); }
  async myXpEvents() { const me = this.me(); return structuredClone(this.s.xpEvents.filter((e) => e.uid === me.uid).sort((a, b) => b.at.localeCompare(a.at))); }

  /** The learner asks for pro or premium: pending until an admin confirms the payment (1.1, bank transfer + slip). */
  async requestPlan(plan: Plan, planTrack: Track | null, note: string) {
    await delay(200);
    const me = this.me();
    me.plan = plan;
    me.planStatus = plan === "free" ? "active" : "pending";
    me.planTrack = plan === "pro" ? (planTrack ?? me.track) : null;
    me.planNote = note.trim();
    me.planRequestedAt = plan === "free" ? null : nowIso();
    this.save(); this.emit();
    return structuredClone(me);
  }

  // ── 1.3: payments ──
  private settingsOf(ownerId: string | null) { return this.s.settings.find((x) => x.ownerId === ownerId); }
  /** Join the learner to the programs the plan covers (pro: its track's pro programs; premium: everything). */
  private enrollCovered(u: UserProfile) {
    for (const p of this.s.programs) if (p.ownerId === u.ownerId && p.published && (u.plan === "premium" || (p.plan !== "premium" && p.track === u.planTrack)) && !u.enrolledProgramIds.includes(p.id)) u.enrolledProgramIds.push(p.id);
  }
  private nextReceipt(ownerId: string, when: string): string {
    const owner = this.s.owners.find((o) => o.id === ownerId);
    const year = new Date(when).getFullYear();
    const key = `${ownerId}:${year}`;
    const seq = (this.s.receiptSeq[key] ?? 0) + 1;
    this.s.receiptSeq[key] = seq;
    return receiptNo(owner?.code ?? "ELLP", year, seq);
  }
  /** A payment is in: the plan is active for `months`, programs joined, a receipt numbered and mailed (test-mode guard). */
  private settlePayment(pay: Payment) {
    const u = this.s.users.find((x) => x.uid === pay.uid);
    if (!u) return;
    const when = nowIso();
    pay.status = "paid"; pay.paidAt = when; pay.receiptNo = pay.receiptNo ?? this.nextReceipt(pay.ownerId, when);
    u.plan = pay.plan; u.planStatus = "active"; u.planTrack = pay.plan === "pro" ? (pay.planTrack ?? u.track) : null;
    u.planExpiresAt = planExpiry(when, pay.months, u.planExpiresAt); u.planRequestedAt = null;
    this.enrollCovered(u);
    const cfg = this.settingsOf(u.ownerId)?.email;
    const status: MailLog["status"] = cfg?.testMode === false ? "sent" : (cfg?.allowedRecipients ?? []).length ? "redirected" : "suppressed";
    this.s.mail.unshift({ id: newId("mail"), ownerId: pay.ownerId, to: u.email, subject: `ใบเสร็จ ${pay.receiptNo} — ${pay.plan} ${pay.amount} ${pay.currency}`, body: `ขอบคุณที่ชำระเงิน แพ็กเกจ ${pay.plan} ใช้ได้ถึง ${u.planExpiresAt?.slice(0, 10)}`, status, testMode: cfg?.testMode ?? true, at: when });
  }
  async myPayments() { const me = this.me(); return structuredClone(this.s.payments.filter((p) => p.uid === me.uid).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); }
  async createCheckout(plan: Plan, planTrack: Track | null, method: PaymentMethod, note: string): Promise<Payment> {
    await delay(300);
    const me = this.me();
    if (plan === "free") throw new Error("VALIDATION");
    const st = this.settingsOf(me.ownerId);
    const pricing = st?.pricing ?? DEFAULT_PRICING;
    const provider = method === "transfer" ? "manual" : (st?.paymentProvider ?? "demo");
    if (provider === "manual" && method !== "transfer") throw new Error("GATEWAY_OFF");
    const pay: Payment = {
      id: newId("pay"), uid: me.uid, ownerId: me.ownerId ?? "", plan, planTrack: plan === "pro" ? (planTrack ?? me.track) : null, amount: priceFor(pricing, plan), currency: "THB", months: pricing.months,
      method, provider, status: "pending", reference: method === "transfer" ? note.trim() : `chrg_${provider}_${newId("x").slice(2)}`, qrPayload: null, receiptNo: null, note: note.trim(), createdAt: nowIso(), paidAt: null,
    };
    if (method === "promptpay") pay.qrPayload = demoQrPayload(pay.id, pay.amount);
    this.s.payments.unshift(pay);
    // a transfer is the 1.1 flow: the plan waits for the admin
    if (method === "transfer") { me.plan = plan; me.planStatus = "pending"; me.planTrack = pay.planTrack; me.planNote = note.trim(); me.planRequestedAt = nowIso(); }
    this.save(); this.emit();
    return structuredClone(pay);
  }
  /** The demo gateway's "payment received": in live mode the provider's webhook does this. */
  async confirmDemoPayment(paymentId: string) {
    await delay(600);
    const me = this.me();
    const pay = this.s.payments.find((p) => p.id === paymentId && p.uid === me.uid);
    if (!pay) throw new Error("PAYMENT_NOT_FOUND");
    if (pay.provider !== "demo") throw new Error("NOT_DEMO");
    if (pay.status === "pending") this.settlePayment(pay);
    this.save(); this.emit();
    return structuredClone(pay);
  }

  // ── 1.4: placement test (public, answers stripped; scored here as the server would) ──
  async publicPlacementTest(ownerId: string) {
    const t = this.s.placementTests.find((x) => x.ownerId === ownerId && x.published);
    return t ? stripPlacementAnswers(structuredClone(t)) : null;
  }
  async submitPlacement(ownerId: string, testId: string, answers: Record<string, number>, visitorKey: string | null): Promise<PlacementResult> {
    await delay(400);
    const test = this.s.placementTests.find((x) => x.id === testId && x.ownerId === ownerId && x.published);
    if (!test) throw new Error("TEST_NOT_FOUND");
    const me = this.s.users.find((x) => x.uid === this.s.sessionUid) ?? null;
    const sc = scorePlacement(test, answers);
    const r: PlacementResult = {
      id: newId("plr"), ownerId, testId, uid: me?.uid ?? null, visitorKey: me ? null : visitorKey, answers, ...sc,
      recommendedProgramIds: recommendPrograms(sc.cefr, this.s.programs.filter((p) => p.ownerId === ownerId), me?.track ?? null), submittedAt: nowIso(),
    };
    // one result per person per tenant: the newest replaces the older
    this.s.placementResults = this.s.placementResults.filter((x) => !(x.ownerId === ownerId && ((me && x.uid === me.uid) || (!me && visitorKey && x.visitorKey === visitorKey))));
    this.s.placementResults.unshift(r);
    if (me) { me.placementCefr = r.cefr; me.placementAt = r.submittedAt; }
    this.save(); if (me) this.emit();
    return structuredClone(r);
  }
  async myPlacement() { const me = this.me(); const r = this.s.placementResults.find((x) => x.uid === me.uid); return r ? structuredClone(r) : null; }

  // ── 1.4: parent accounts ──
  private childOf(parent: UserProfile, uid: string): UserProfile {
    const child = this.s.users.find((x) => x.uid === uid);
    if (!child || !canViewChild(parent, child)) throw new Error("FORBIDDEN");
    return child;
  }
  async myChildren() { const me = this.me(); return structuredClone(this.s.users.filter((u) => canViewChild(me, u))); }
  async childOverview(uid: string, weekKey: string): Promise<ChildOverview> {
    const me = this.me();
    const child = this.childOf(me, uid);
    const programs = this.s.programs.filter((p) => p.ownerId === child.ownerId && child.enrolledProgramIds.includes(p.id));
    const lessons = this.s.lessons.filter((l) => programs.some((p) => p.id === l.programId));
    const progress = this.s.progress.filter((p) => p.uid === uid);
    const xp = this.s.xpEvents.filter((e) => e.uid === uid);
    const weeks = recentWeeks(8);
    const i = Math.max(0, weeks.indexOf(weekKey));
    return structuredClone({
      child, report: buildWeeklyReport(child, lessons, progress, xp, weeks[i]), previous: buildWeeklyReport(child, lessons, progress, xp, weeks[i + 1] ?? weeks[i]),
      programs, lessons, progress, xp: xp.sort((a, b) => b.at.localeCompare(a.at)), placement: this.s.placementResults.find((r) => r.uid === uid) ?? null, certificates: this.s.certificates.filter((c) => c.uid === uid),
    });
  }
  /** The weekly email: the report's sentences to the parent's address, through the tenant's test-mode guard. */
  private mailReport(parent: UserProfile, child: UserProfile, weekKey: string): MailLog {
    const programs = this.s.programs.filter((p) => p.ownerId === child.ownerId && child.enrolledProgramIds.includes(p.id));
    const lessons = this.s.lessons.filter((l) => programs.some((p) => p.id === l.programId));
    const r = buildWeeklyReport(child, lessons, this.s.progress.filter((p) => p.uid === child.uid), this.s.xpEvents.filter((e) => e.uid === child.uid), weekKey);
    const cfg = this.settingsOf(parent.ownerId)?.email;
    const allowed = (cfg?.allowedRecipients ?? []).map((a) => a.toLowerCase());
    const status: MailLog["status"] = cfg?.testMode === false ? "sent" : allowed.length === 0 ? "suppressed" : allowed.includes(parent.email.toLowerCase()) ? "sent" : "redirected";
    const mail: MailLog = { id: newId("mail"), ownerId: parent.ownerId ?? "", to: parent.email, subject: `รายงานประจำสัปดาห์ของ ${child.displayName} (${r.from} – ${r.to})`, body: `${r.summary.th}\n\n${r.summary.en}`, status, testMode: cfg?.testMode ?? true, at: nowIso() };
    this.s.mail.unshift(mail);
    return mail;
  }
  async emailChildReport(uid: string, weekKey: string) {
    await delay(300);
    const me = this.me();
    const mail = this.mailReport(me, this.childOf(me, uid), weekKey);
    this.save();
    return structuredClone(mail);
  }
  /** The parent confirms the acknowledgement on the child's record (a record of who confirmed, still not verified identity: decision 0004/0008). */
  async confirmChildConsent(uid: string) {
    const me = this.me();
    const child = this.childOf(me, uid);
    child.parentConsent = { acknowledged: true, at: nowIso(), note: `parent:${me.email}` };
    this.save();
    return structuredClone(child);
  }

  // ── 1.3: certificates ──
  async myCertificates() { const me = this.me(); return structuredClone(this.s.certificates.filter((c) => c.uid === me.uid)); }
  async issueCertificate(programId: string): Promise<Certificate> {
    await delay(300);
    const me = this.me();
    const existing = this.s.certificates.find((c) => c.uid === me.uid && c.programId === programId);
    if (existing) return structuredClone(existing);
    const program = this.s.programs.find((p) => p.id === programId);
    if (!program) throw new Error("PROGRAM_NOT_FOUND");
    const lessons = this.s.lessons.filter((l) => l.programId === programId);
    if (!programComplete(lessons, this.s.progress.filter((p) => p.uid === me.uid))) throw new Error("PROGRAM_NOT_COMPLETE");
    const owner = this.s.owners.find((o) => o.id === program.ownerId);
    let code = certificateCode();
    while (this.s.certificates.some((c) => c.code === code)) code = certificateCode();
    const cert: Certificate = {
      id: newId("cert"), code, uid: me.uid, learnerName: me.displayName, ownerId: program.ownerId, ownerName: owner?.name ?? { th: "", en: "" }, programId, programTitle: program.title, track: program.track, cefr: program.cefr,
      lessons: lessons.filter((l) => l.published).length, xpEarned: this.s.xpEvents.filter((e) => e.uid === me.uid && e.programId === programId).reduce((n, e) => n + e.xp, 0), issuedAt: nowIso(),
    };
    this.s.certificates.unshift(cert);
    this.save();
    return structuredClone(cert);
  }
  async verifyCertificate(code: string) { const c = this.s.certificates.find((x) => x.code.toUpperCase() === code.trim().toUpperCase()); return c ? structuredClone(c) : null; }

  // ── 1.3: mock tests ──
  async mockTests(ownerId: string) {
    const me = this.s.users.find((x) => x.uid === this.s.sessionUid);
    const all = this.s.mockTests.filter((t) => t.ownerId === ownerId);
    return structuredClone(me && me.role !== "learner" ? all : all.filter((t) => t.published));
  }
  async startMockAttempt(testId: string): Promise<MockAttempt> {
    await delay(200);
    const me = this.me();
    const test = this.s.mockTests.find((t) => t.id === testId && t.published);
    if (!test) throw new Error("TEST_NOT_FOUND");
    if (me.role === "learner" && PLAN_RANK[effectivePlan(me)] < PLAN_RANK[test.requiredPlan]) throw new Error("PLAN_REQUIRED");
    const open = this.s.mockAttempts.find((a) => a.uid === me.uid && a.testId === testId && !a.submittedAt);
    if (open) return structuredClone(open);
    const att: MockAttempt = { id: newId("att"), uid: me.uid, testId, ownerId: test.ownerId, startedAt: nowIso(), submittedAt: null, answers: {}, raw: 0, total: test.sections.reduce((n, s) => n + s.questions.length, 0), sectionScores: [], scaled: 0, scaledLabel: "", passed: false, timedOut: false };
    this.s.mockAttempts.unshift(att);
    this.save();
    return structuredClone(att);
  }
  async submitMockAttempt(attemptId: string, answers: Record<string, number>, timedOut: boolean) {
    await delay(300);
    const me = this.me();
    const att = this.s.mockAttempts.find((a) => a.id === attemptId && a.uid === me.uid);
    if (!att) throw new Error("ATTEMPT_NOT_FOUND");
    const test = this.s.mockTests.find((t) => t.id === att.testId);
    if (!test) throw new Error("TEST_NOT_FOUND");
    const p = this.progressOf(me.uid, `mock:${test.id}`);
    const out = this.newResult(p, me);
    if (!att.submittedAt) {
      const sc = scoreMock(test, answers);
      Object.assign(att, { answers, submittedAt: nowIso(), timedOut, ...sc });
      this.touchDay(me, out);
      this.addXp(me, null, "quiz", sc.passed ? MOCK_XP_PASS : MOCK_XP_DONE, `${test.title.en}: ${sc.scaledLabel}`, out);
    }
    out.levelAfter = levelFor(me.xp);
    this.save(); this.emit();
    return { attempt: structuredClone(att), result: out };
  }
  async myMockAttempts() { const me = this.me(); return structuredClone(this.s.mockAttempts.filter((a) => a.uid === me.uid).sort((a, b) => b.startedAt.localeCompare(a.startedAt))); }

  async enroll(programId: string) {
    const me = this.me();
    if (!me.enrolledProgramIds.includes(programId)) me.enrolledProgramIds.push(programId);
    this.save(); this.emit();
    return structuredClone(me);
  }

  private progressOf(uid: string, lessonId: string): LessonProgress {
    let p = this.s.progress.find((x) => x.uid === uid && x.lessonId === lessonId);
    if (!p) {
      p = { uid, lessonId, watchedPct: 0, completed: false, quizScore: null, quizTotal: null, completedAt: null, updatedAt: nowIso(), watchedSec: 0, lastPositionSec: 0, replays: 0, checkpointResults: {}, pausedUntil: null };
      this.s.progress.push(p);
    }
    return p;
  }

  private addXp(me: UserProfile, programId: string | null, kind: XpEvent["kind"], xp: number, note: string, out: ActivityResult) {
    if (xp <= 0) return;
    me.xp += xp;
    out.xpGained += xp;
    out.events.push({ kind, xp, note });
    this.s.xpEvents.push({ id: newId("xe"), uid: me.uid, ownerId: me.ownerId ?? "", programId, kind, xp, note, at: nowIso() });
  }

  private giveBadge(me: UserProfile, badgeId: string, out: ActivityResult) {
    if (me.badgeIds.includes(badgeId)) return;
    const b = this.s.badges.find((x) => x.id === badgeId);
    if (!b) return;
    me.badgeIds.push(badgeId);
    out.newBadges.push(structuredClone(b));
  }

  /** The age-band rule of this learner under their tenant's settings (pass mark, streak freeze). */
  private ageRule(me: UserProfile) {
    return ageRuleFor(this.s.settings.find((x) => x.ownerId === me.ownerId) ?? null, me);
  }

  /** First activity of the day: the streak moves and pays its bonus; the streak quests advance. */
  private touchDay(me: UserProfile, out: ActivityResult) {
    const today = dayKey();
    const n = nextStreak(me.streakDays, me.lastActiveDate, today, this.ageRule(me).streakFreeze);
    if (!n.firstToday) return;
    me.streakDays = n.streakDays;
    me.lastActiveDate = today;
    this.addXp(me, null, "streak", streakBonus(me.streakDays), `Day ${me.streakDays}`, out);
    this.advanceQuests(me, "streak_days", me.streakDays, true, null, out);
  }

  /** Move every matching active quest of the owner; `absolute` sets the progress (streak) instead of adding. */
  private advanceQuests(me: UserProfile, goal: Quest["goal"]["type"], amount: number, absolute: boolean, programId: string | null, out: ActivityResult) {
    const quests = this.s.quests.filter((q) => q.active && q.ownerId === me.ownerId && q.goal.type === goal && (q.programId === null || q.programId === programId));
    for (const q of quests) {
      const period = periodKeyFor(q.scope);
      let qp = this.s.questProgress.find((x) => x.uid === me.uid && x.questId === q.id && x.periodKey === period);
      if (!qp) { qp = { uid: me.uid, questId: q.id, periodKey: period, progress: 0, completed: false, completedAt: null }; this.s.questProgress.push(qp); }
      if (qp.completed) continue;
      qp.progress = absolute ? Math.max(qp.progress, amount) : qp.progress + amount;
      if (qp.progress >= q.goal.target) {
        qp.completed = true; qp.completedAt = nowIso();
        out.questsCompleted.push(structuredClone(q));
        this.addXp(me, q.programId, "quest", q.xpReward, q.title.en, out);
        if (q.badgeId) this.giveBadge(me, q.badgeId, out);
      }
    }
  }

  private finishLessonIfDue(me: UserProfile, lesson: Lesson, p: LessonProgress, out: ActivityResult) {
    if (p.completed || !lessonComplete(lesson, p, this.ageRule(me).quizPassPct)) return;
    p.completed = true; p.completedAt = nowIso();
    out.lessonCompleted = true;
    this.giveBadge(me, "bdg_first", out);
  }

  /** The plan gate (lib/access.ts): a lesson beyond the preview needs a plan that covers the program. */
  private assertPlan(me: UserProfile, lesson: Lesson) {
    const program = this.s.programs.find((p) => p.id === lesson.programId);
    if (!program) throw new Error("PROGRAM_NOT_FOUND");
    if (!canAccessLesson(me, program, lesson, this.s.lessons.filter((l) => l.programId === program.id))) throw new Error("PLAN_REQUIRED");
  }

  private newResult(p: LessonProgress, me: UserProfile): ActivityResult {
    return { progress: p, xpGained: 0, events: [], levelBefore: levelFor(me.xp), levelAfter: levelFor(me.xp), newBadges: [], questsCompleted: [], lessonCompleted: false };
  }

  async recordWatch(lessonId: string, watchedPct: number): Promise<ActivityResult> {
    await delay(80);
    const me = this.me();
    const lesson = this.s.lessons.find((l) => l.id === lessonId);
    if (!lesson) throw new Error("LESSON_NOT_FOUND");
    this.assertPlan(me, lesson);
    const p = this.progressOf(me.uid, lessonId);
    const out = this.newResult(p, me);
    const before = p.watchedPct;
    p.watchedPct = Math.max(p.watchedPct, Math.min(100, Math.round(watchedPct)));
    p.updatedAt = nowIso();
    if (before < WATCH_COMPLETE_PCT && p.watchedPct >= WATCH_COMPLETE_PCT) {
      this.touchDay(me, out);
      this.addXp(me, lesson.programId, "video", lesson.xpReward, lesson.title.en, out);
      this.advanceQuests(me, "watch_videos", 1, false, lesson.programId, out);
      this.advanceQuests(me, "earn_xp", out.xpGained, false, lesson.programId, out);
      this.finishLessonIfDue(me, lesson, p, out);
    }
    out.levelAfter = levelFor(me.xp);
    out.progress = structuredClone(p);
    this.save(); this.emit();
    return out;
  }

  /** The player's position report: the percentage follows from the duration; played seconds and the position are kept for the admin. */
  async recordPosition(lessonId: string, positionSec: number, watchedSec: number, durationSec: number): Promise<ActivityResult> {
    const me = this.me();
    const p = this.progressOf(me.uid, lessonId);
    p.lastPositionSec = Math.max(0, Math.round(positionSec));
    p.watchedSec = Math.max(p.watchedSec, Math.round(watchedSec));
    const pct = durationSec > 0 ? Math.min(100, Math.round((positionSec / durationSec) * 100)) : 0;
    return this.recordWatch(lessonId, pct);
  }

  /** An in-video question answered (or timed out): a right answer pays the policy's XP once. */
  async recordCheckpoint(lessonId: string, checkpointId: string, correct: boolean): Promise<ActivityResult> {
    const me = this.me();
    const lesson = this.s.lessons.find((l) => l.id === lessonId);
    if (!lesson) throw new Error("LESSON_NOT_FOUND");
    const p = this.progressOf(me.uid, lessonId);
    const out = this.newResult(p, me);
    if (!(checkpointId in p.checkpointResults)) {
      p.checkpointResults[checkpointId] = correct;
      if (correct) { this.touchDay(me, out); this.addXp(me, lesson.programId, "quiz", this.policyOf(me.ownerId).checkpointXp, `${lesson.title.en} checkpoint`, out); }
    }
    out.levelAfter = levelFor(me.xp);
    out.progress = structuredClone(p);
    this.save(); this.emit();
    return out;
  }

  async recordReplay(lessonId: string) {
    const me = this.me();
    const p = this.progressOf(me.uid, lessonId);
    p.replays += 1; p.updatedAt = nowIso();
    this.save();
    return structuredClone(p);
  }

  async videoUrl(lessonId: string) { return this.s.lessons.find((l) => l.id === lessonId)?.videoUrl ?? ""; }

  private profileOfLesson(lesson: Lesson) {
    const program = this.s.programs.find((p) => p.id === lesson.programId);
    return program ? (program.proctoring ?? defaultProfileFor(program.track)) : "off";
  }

  /** The ladder: attention events of a strict program warn twice and pause the lesson the third time; everything else is recorded. */
  async reportViolation(lessonId: string | null, type: ViolationType, detail: string) {
    const me = this.me();
    const lesson = lessonId ? this.s.lessons.find((l) => l.id === lessonId) : undefined;
    const policy = this.policyOf(me.ownerId);
    let action = "logged";
    let pausedUntil: string | null = null;
    let strikes = 0;
    if (lesson && ATTENTION_TYPES.includes(type)) {
      const punish = PROFILE_RULES[this.profileOfLesson(lesson)].punishAttention;
      strikes = this.s.violations.filter((v) => v.uid === me.uid && v.lessonId === lesson.id && ATTENTION_TYPES.includes(v.type) && v.action !== "logged").length + 1;
      action = ladderAction(strikes, policy, punish);
      if (action === "paused") {
        const p = this.progressOf(me.uid, lesson.id);
        p.pausedUntil = new Date(Date.now() + policy.pauseMinutes * 60000).toISOString();
        pausedUntil = p.pausedUntil;
      }
    }
    const violation: Violation = { id: newId("vio"), uid: me.uid, ownerId: me.ownerId ?? "", lessonId, type, action, detail, at: nowIso() };
    this.s.violations.unshift(violation);
    this.save();
    return { violation: structuredClone(violation), action, pausedUntil, strikes };
  }

  async submitQuiz(lessonId: string, answers: number[]): Promise<ActivityResult> {
    await delay(120);
    const me = this.me();
    const lesson = this.s.lessons.find((l) => l.id === lessonId);
    if (!lesson) throw new Error("LESSON_NOT_FOUND");
    this.assertPlan(me, lesson);
    const p = this.progressOf(me.uid, lessonId);
    const out = this.newResult(p, me);
    const total = lesson.quiz.length;
    const correct = lesson.quiz.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
    const bestBefore = p.quizScore ?? -1;
    p.quizTotal = total;
    p.quizScore = Math.max(bestBefore, correct);
    p.updatedAt = nowIso();
    this.touchDay(me, out);
    // XP is paid for the improvement over the best score so far, so a retake cannot farm points
    const gain = quizXp(correct, total) - (bestBefore >= 0 ? quizXp(bestBefore, total) : 0);
    if (gain > 0) this.addXp(me, lesson.programId, "quiz", gain, `${lesson.title.en} quiz ${correct}/${total}`, out);
    const passPct = this.ageRule(me).quizPassPct;
    const passedBefore = bestBefore >= 0 && quizPassed(bestBefore, total, passPct);
    if (quizPassed(correct, total, passPct) && !passedBefore) this.advanceQuests(me, "pass_quizzes", 1, false, lesson.programId, out);
    if (gain > 0) this.advanceQuests(me, "earn_xp", gain, false, lesson.programId, out);
    if (lesson.id === "les_babyshark" && correct === total) this.giveBadge(me, "bdg_shark", out);
    this.finishLessonIfDue(me, lesson, p, out);
    out.levelAfter = levelFor(me.xp);
    out.progress = structuredClone(p);
    this.save(); this.emit();
    return out;
  }

  async leaderboard(programId: string | null, period: LeaderboardPeriod): Promise<LeaderboardRow[]> {
    const me = this.me();
    const learners = this.s.users.filter((u) => u.role === "learner" && u.ownerId === me.ownerId && u.active);
    const wk = weekKey();
    const score = (u: UserProfile): number => {
      if (period === "all" && !programId) return u.xp;
      return this.s.xpEvents
        .filter((e) => e.uid === u.uid && (!programId || e.programId === programId || e.programId === null) && (period === "all" || weekKey(new Date(e.at)) === wk))
        .reduce((n, e) => n + e.xp, 0);
    };
    const size = this.s.settings.find((s) => s.ownerId === me.ownerId)?.leaderboard.size ?? 10;
    return learners
      .map((u) => ({ u, xp: score(u) }))
      .sort((a, b) => b.xp - a.xp || a.u.displayName.localeCompare(b.u.displayName))
      .slice(0, size)
      .map((r, i) => ({ rank: i + 1, uid: r.u.uid, displayName: r.u.displayName, avatarColor: r.u.avatarColor, xp: r.xp, level: levelFor(r.u.xp), isMe: r.u.uid === me.uid }));
  }

  async myMessages() { const me = this.me(); return structuredClone(this.s.messages.filter((m) => m.fromUid === me.uid).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); }

  async sendMessage(subject: string, body: string): Promise<InboxMessage> {
    await delay(200);
    const me = this.me();
    const m: InboxMessage = { id: newId("msg"), ownerId: me.ownerId ?? "", fromUid: me.uid, fromName: me.displayName, fromEmail: me.email, subject: subject.trim(), body: body.trim(), status: "open", createdAt: nowIso(), replies: [] };
    this.s.messages.unshift(m);
    this.save();
    return structuredClone(m);
  }

  // ── owner admin ──
  async members(ownerId: string) { return structuredClone(this.s.users.filter((u) => u.ownerId === ownerId)); }
  async saveMember(u: UserProfile) {
    const i = this.s.users.findIndex((x) => x.uid === u.uid);
    if (i >= 0) this.s.users[i] = { ...this.s.users[i], ...u }; else this.s.users.push({ ...u, uid: u.uid || newId("u"), createdAt: u.createdAt || nowIso() });
    this.save(); this.emit();
    return structuredClone(this.s.users.find((x) => x.uid === u.uid) ?? this.s.users[this.s.users.length - 1]);
  }
  async removeMember(uid: string) { this.s.users = this.s.users.filter((u) => u.uid !== uid); for (const u of this.s.users) u.childUids = u.childUids.filter((c) => c !== uid); this.save(); }
  async setMemberPlan(uid: string, plan: Plan, status: PlanStatus, planTrack: Track | null, note: string) {
    const u = this.s.users.find((x) => x.uid === uid);
    if (!u) throw new Error("MEMBER_NOT_FOUND");
    u.plan = plan; u.planStatus = plan === "free" ? "active" : status; u.planTrack = plan === "pro" ? (planTrack ?? u.track) : null; u.planNote = note;
    if (status === "active" && plan !== "free") {
      // an approved plan joins the learner to the programs it covers and runs for the tenant's months; a pending transfer becomes a paid payment with a receipt
      const months = this.settingsOf(u.ownerId)?.pricing.months ?? 1;
      if (!u.planExpiresAt || expiryStatus(u.planExpiresAt) === "expired") u.planExpiresAt = planExpiry(nowIso(), months, null);
      this.enrollCovered(u);
      const pending = this.s.payments.find((p) => p.uid === uid && p.status === "pending" && p.plan === plan);
      if (pending) this.settlePayment(pending);
    }
    if (plan === "free" || status === "expired") { if (plan === "free") u.planExpiresAt = null; }
    this.save(); this.emit();
    return structuredClone(u);
  }
  async payments(ownerId: string) { return structuredClone(this.s.payments.filter((p) => p.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); }
  async setPaymentStatus(paymentId: string, status: "paid" | "refunded" | "failed") {
    const pay = this.s.payments.find((p) => p.id === paymentId);
    if (!pay) throw new Error("PAYMENT_NOT_FOUND");
    const u = this.s.users.find((x) => x.uid === pay.uid);
    if (status === "paid" && pay.status !== "paid") this.settlePayment(pay);
    else if (status === "refunded") { pay.status = "refunded"; if (u && u.plan === pay.plan) { u.plan = "free"; u.planStatus = "active"; u.planTrack = null; u.planExpiresAt = null; } }
    else if (status === "failed") { pay.status = "failed"; if (u && u.planStatus === "pending" && u.plan === pay.plan) { u.plan = "free"; u.planStatus = "active"; u.planTrack = null; u.planRequestedAt = null; } }
    this.save(); this.emit();
    return structuredClone(pay);
  }
  async certificates(ownerId: string) { return structuredClone(this.s.certificates.filter((c) => c.ownerId === ownerId)); }
  async saveMockTest(t: MockTest) {
    const i = this.s.mockTests.findIndex((x) => x.id === t.id);
    const saved = { ...t, id: t.id || newId("mock") };
    if (i >= 0) this.s.mockTests[i] = saved; else this.s.mockTests.push(saved);
    this.save();
    return structuredClone(saved);
  }
  async removeMockTest(id: string) { this.s.mockTests = this.s.mockTests.filter((t) => t.id !== id); this.save(); }
  async mockAttempts(ownerId: string) { return structuredClone(this.s.mockAttempts.filter((a) => a.ownerId === ownerId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))); }
  async placementTests(ownerId: string) { return structuredClone(this.s.placementTests.filter((t) => t.ownerId === ownerId)); }
  async savePlacementTest(t: PlacementTest) {
    const i = this.s.placementTests.findIndex((x) => x.id === t.id);
    const saved = { ...t, id: t.id || newId("plc") };
    if (i >= 0) this.s.placementTests[i] = saved; else this.s.placementTests.push(saved);
    this.save();
    return structuredClone(saved);
  }
  async removePlacementTest(id: string) { this.s.placementTests = this.s.placementTests.filter((t) => t.id !== id); this.save(); }
  async placementResults(ownerId: string) { return structuredClone(this.s.placementResults.filter((r) => r.ownerId === ownerId)); }
  async sendWeeklyReports(ownerId: string) {
    await delay(500);
    const week = recentWeeks(0)[0];
    const out: MailLog[] = [];
    for (const parent of this.s.users.filter((u) => u.role === "parent" && u.ownerId === ownerId && u.active)) {
      for (const uid of parent.childUids) { const child = this.s.users.find((x) => x.uid === uid); if (child && canViewChild(parent, child)) out.push(this.mailReport(parent, child, week)); }
    }
    this.save();
    return structuredClone(out);
  }
  async violations(ownerId: string) { return structuredClone(this.s.violations.filter((v) => v.ownerId === ownerId)); }
  async sessions(ownerId: string) { const uids = new Set(this.s.users.filter((u) => u.ownerId === ownerId).map((u) => u.uid)); return structuredClone(this.s.sessions.filter((s) => uids.has(s.uid) && s.active && sessionAlive(s.lastSeenAt))); }
  async liftPause(uid: string, lessonId: string) { const p = this.s.progress.find((x) => x.uid === uid && x.lessonId === lessonId); if (p) p.pausedUntil = null; this.save(); }
  async chatThreads(ownerId: string) { return structuredClone(this.s.chats.filter((c) => c.ownerId === ownerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); }
  async chatReply(threadId: string, text: string) {
    await delay(150);
    const me = this.me();
    const c = this.s.chats.find((x) => x.id === threadId);
    if (!c) throw new Error("CHAT_NOT_FOUND");
    c.messages.push({ id: newId("cm"), from: "admin", byName: me.displayName, text: text.trim(), at: nowIso() });
    c.updatedAt = nowIso();
    this.save();
    return structuredClone(c);
  }
  async chatSetStatus(threadId: string, status: ChatThread["status"], linkedUid?: string | null) {
    const c = this.s.chats.find((x) => x.id === threadId);
    if (!c) throw new Error("CHAT_NOT_FOUND");
    c.status = status; if (linkedUid !== undefined) c.linkedUid = linkedUid; c.updatedAt = nowIso();
    this.save();
    return structuredClone(c);
  }

  async saveProgram(p: Program) {
    const i = this.s.programs.findIndex((x) => x.id === p.id);
    const saved = { ...p, id: p.id || newId("prg"), createdAt: p.createdAt || nowIso() };
    if (i >= 0) this.s.programs[i] = saved; else this.s.programs.push(saved);
    this.save();
    return structuredClone(saved);
  }
  async removeProgram(id: string) {
    this.s.programs = this.s.programs.filter((p) => p.id !== id);
    this.s.lessons = this.s.lessons.filter((l) => l.programId !== id);
    this.save();
  }
  async saveLesson(l: Lesson) {
    const i = this.s.lessons.findIndex((x) => x.id === l.id);
    const saved = { ...l, id: l.id || newId("les") };
    if (i >= 0) this.s.lessons[i] = saved; else this.s.lessons.push(saved);
    this.save();
    return structuredClone(saved);
  }
  async removeLesson(id: string) { this.s.lessons = this.s.lessons.filter((l) => l.id !== id); this.save(); }
  async saveQuest(q: Quest) {
    const i = this.s.quests.findIndex((x) => x.id === q.id);
    const saved = { ...q, id: q.id || newId("qst") };
    if (i >= 0) this.s.quests[i] = saved; else this.s.quests.push(saved);
    this.save();
    return structuredClone(saved);
  }
  async removeQuest(id: string) { this.s.quests = this.s.quests.filter((q) => q.id !== id); this.save(); }

  async inbox(ownerId: string) { return structuredClone(this.s.messages.filter((m) => m.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); }

  /** The reply is stored on the thread and mailed to the sender through the owner's email settings (test mode redirects it). */
  async replyMessage(messageId: string, body: string) {
    await delay(400);
    const me = this.me();
    const m = this.s.messages.find((x) => x.id === messageId);
    if (!m) throw new Error("MESSAGE_NOT_FOUND");
    const cfg = this.s.settings.find((s) => s.ownerId === m.ownerId)?.email;
    const testMode = cfg?.testMode ?? true;
    const allowed = (cfg?.allowedRecipients ?? []).map((a) => a.toLowerCase());
    let status: MailLog["status"] = "sent";
    if (testMode) status = allowed.length === 0 ? "suppressed" : allowed.includes(m.fromEmail.toLowerCase()) ? "sent" : "redirected";
    const mail: MailLog = { id: newId("mail"), ownerId: m.ownerId, to: m.fromEmail, subject: `Re: ${m.subject}`, body: body.trim(), status, testMode, at: nowIso() };
    this.s.mail.unshift(mail);
    const reply: MessageReply = { id: newId("rp"), byUid: me.uid, byName: me.displayName, body: body.trim(), at: nowIso(), mailId: mail.id };
    m.replies.push(reply);
    m.status = "answered";
    this.save();
    return { reply: structuredClone(reply), mail: structuredClone(mail) };
  }
  async setMessageStatus(messageId: string, status: InboxMessage["status"]) {
    const m = this.s.messages.find((x) => x.id === messageId);
    if (!m) throw new Error("MESSAGE_NOT_FOUND");
    m.status = status; this.save();
    return structuredClone(m);
  }
  async mailLog(ownerId: string) { return structuredClone(this.s.mail.filter((m) => m.ownerId === ownerId).sort((a, b) => b.at.localeCompare(a.at))); }
  async settings(ownerId: string) {
    let s = this.s.settings.find((x) => x.ownerId === ownerId);
    if (!s) { s = { ownerId, email: { fromName: "ELLP", fromAddress: "no-reply@example.com", replyTo: "", testMode: true, allowedRecipients: [] }, leaderboard: { visible: true, size: 10 }, ageRules: { ...DEFAULT_AGE_RULES }, lineUrl: "", paymentInstructions: { th: "", en: "" }, integrity: { ...DEFAULT_POLICY }, pricing: { ...DEFAULT_PRICING }, paymentProvider: "demo" }; this.s.settings.push(s); }
    return structuredClone(s);
  }
  async saveSettings(s: OwnerSettings) {
    const i = this.s.settings.findIndex((x) => x.ownerId === s.ownerId);
    if (i >= 0) this.s.settings[i] = s; else this.s.settings.push(s);
    this.save();
    return structuredClone(s);
  }

  async adminStats(ownerId: string | null): Promise<AdminStats> {
    const inOwner = <T extends { ownerId: string | null }>(xs: T[]) => xs.filter((x) => !ownerId || x.ownerId === ownerId);
    const learners = inOwner(this.s.users).filter((u) => u.role === "learner");
    const programs = inOwner(this.s.programs);
    const lessons = this.s.lessons.filter((l) => programs.some((p) => p.id === l.programId));
    const today = dayKey(), wk = weekKey();
    const events = inOwner(this.s.xpEvents);
    const days: { day: string; xp: number }[] = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d); days.push({ day: k, xp: events.filter((e) => dayKey(new Date(e.at)) === k).reduce((n, e) => n + e.xp, 0) }); }
    const completions = this.s.progress.filter((p) => p.completed && learners.some((u) => u.uid === p.uid));
    const top = lessons.map((lesson) => ({ lesson, completions: completions.filter((p) => p.lessonId === lesson.id).length })).sort((a, b) => b.completions - a.completions).slice(0, 5);
    return {
      learners: learners.length,
      activeToday: learners.filter((u) => u.lastActiveDate === today).length,
      programs: programs.length,
      lessons: lessons.length,
      openMessages: inOwner(this.s.messages).filter((m) => m.status === "open").length,
      pendingPlans: learners.filter((u) => u.planStatus === "pending").length,
      revenueThisMonth: inOwner(this.s.payments).filter((p) => p.status === "paid" && p.paidAt && p.paidAt.slice(0, 7) === dayKey().slice(0, 7)).reduce((n, p) => n + p.amount, 0),
      openChats: inOwner(this.s.chats).filter((c) => c.status === "open").length,
      xpThisWeek: events.filter((e) => weekKey(new Date(e.at)) === wk).reduce((n, e) => n + e.xp, 0),
      completionsThisWeek: completions.filter((p) => p.completedAt && weekKey(new Date(p.completedAt)) === wk).length,
      xpByDay: days,
      topLessons: structuredClone(top),
    };
  }

  // ── super admin ──
  async saveOwner(o: Owner) {
    const i = this.s.owners.findIndex((x) => x.id === o.id);
    const saved = { ...o, id: o.id || newId("own"), createdAt: o.createdAt || nowIso() };
    if (i >= 0) this.s.owners[i] = saved; else this.s.owners.push(saved);
    this.save();
    return structuredClone(saved);
  }
  async removeOwner(id: string) {
    this.s.owners = this.s.owners.filter((o) => o.id !== id);
    const prg = this.s.programs.filter((p) => p.ownerId === id).map((p) => p.id);
    this.s.programs = this.s.programs.filter((p) => p.ownerId !== id);
    this.s.lessons = this.s.lessons.filter((l) => !prg.includes(l.programId));
    this.s.quests = this.s.quests.filter((q) => q.ownerId !== id);
    this.s.users = this.s.users.filter((u) => u.ownerId !== id);
    this.s.messages = this.s.messages.filter((m) => m.ownerId !== id);
    this.s.chats = this.s.chats.filter((c) => c.ownerId !== id);
    this.s.violations = this.s.violations.filter((v) => v.ownerId !== id);
    this.s.payments = this.s.payments.filter((p) => p.ownerId !== id);
    this.s.certificates = this.s.certificates.filter((c) => c.ownerId !== id);
    this.s.mockTests = this.s.mockTests.filter((t) => t.ownerId !== id);
    this.s.placementTests = this.s.placementTests.filter((t) => t.ownerId !== id);
    this.s.placementResults = this.s.placementResults.filter((r) => r.ownerId !== id);
    this.save();
  }
  async resetDemo() { this.s = seed(); this.save(); this.emit(); }
}

export const demoApi: EllpApi = new DemoStore();
