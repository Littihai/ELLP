import type {
  Badge, ChatThread, InboxMessage, LeaderboardRow, Lesson, LessonProgress, MailLog, MessageReply, Owner, OwnerSettings, Plan, PlanStatus, Program, Quest,
  QuestProgress, SignUpInput, Track, UserProfile, XpEvent,
} from "@/types";
import {
  BADGES, CHATS, DEMO_PASSWORD, LESSONS, MAIL_LOG, MESSAGES, OWNERS, OWNER_SETTINGS, PROGRAMS, PROGRESS, QUESTS, QUEST_PROGRESS, USERS, XP_EVENTS,
} from "@/data/seed";
import { canAccessLesson } from "@/lib/access";
import {
  DEFAULT_AGE_RULES, WATCH_COMPLETE_PCT, ageRuleFor, dayKey, levelFor, lessonComplete, nextStreak, periodKeyFor, quizPassed, quizXp, streakBonus, weekKey,
} from "@/lib/gamification";
import { newId, nowIso } from "@/lib/format";
import type { ActivityResult, AdminStats, EllpApi, LeaderboardPeriod, PublicProgram } from "./api";

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
  /** passwords of accounts created on the sign-up page (seeded accounts all use DEMO_PASSWORD) */
  passwords: Record<string, string>;
  sessionUid: string | null;
}

// v3: 1.1 added tracks, plans and chats; an older saved state is replaced by a fresh seed
const KEY = "ellp.demo.v3";

function seed(): State {
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
  return {
    owners: clone(OWNERS), programs: clone(PROGRAMS), lessons: clone(LESSONS), quests: clone(QUESTS), badges: clone(BADGES), users: clone(USERS),
    progress: clone(PROGRESS), questProgress: clone(QUEST_PROGRESS), xpEvents: clone(XP_EVENTS), messages: clone(MESSAGES), mail: clone(MAIL_LOG),
    settings: clone(OWNER_SETTINGS), chats: clone(CHATS), passwords: {}, sessionUid: null,
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
    const u = this.s.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    const expected = u ? (this.s.passwords[u.uid] ?? DEMO_PASSWORD) : DEMO_PASSWORD;
    if (!u || password !== expected) throw new Error("INVALID_CREDENTIALS");
    if (!u.active) throw new Error("ACCOUNT_DISABLED");
    this.s.sessionUid = u.uid;
    this.save(); this.emit();
    return structuredClone(u);
  }
  async signOut() { this.s.sessionUid = null; this.save(); this.emit(); }

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
      birthYear: input.birthYear, track: input.track, allowAllAges: false, parentConsent: { acknowledged: false, at: null, note: "" },
      plan: input.plan, planStatus: wantsPaid ? "pending" : "active", planTrack: input.plan === "pro" ? (input.planTrack ?? input.track) : null,
      planNote: input.note.trim(), planRequestedAt: wantsPaid ? nowIso() : null,
      xp: 0, streakDays: 0, lastActiveDate: null, badgeIds: [], avatarColor: ["#066fd1", "#2f7f86", "#b0566f", "#a8612a", "#6b5fb0"][Math.floor(Math.random() * 5)], active: true, createdAt: nowIso(),
    };
    // the free programs of the learner's track (and the foundation ones) are joined at once, so the home page has something to show
    u.enrolledProgramIds = this.s.programs.filter((p) => p.ownerId === u.ownerId && p.published && (p.track === u.track || p.track === "foundation")).map((p) => p.id);
    this.s.users.push(u);
    this.s.passwords[u.uid] = input.password;
    // a chat begun as a visitor follows the person into their account
    const vk = (() => { try { return localStorage.getItem("ellp.visitor"); } catch { return null; } })();
    for (const c of this.s.chats) if (vk && c.visitorKey === vk && c.ownerId === u.ownerId && !c.uid) { c.uid = u.uid; c.email = u.email; c.name = u.displayName; }
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
  async currentUser() { const u = this.s.users.find((x) => x.uid === this.s.sessionUid); return u ? structuredClone(u) : null; }
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

  async enroll(programId: string) {
    const me = this.me();
    if (!me.enrolledProgramIds.includes(programId)) me.enrolledProgramIds.push(programId);
    this.save(); this.emit();
    return structuredClone(me);
  }

  private progressOf(uid: string, lessonId: string): LessonProgress {
    let p = this.s.progress.find((x) => x.uid === uid && x.lessonId === lessonId);
    if (!p) {
      p = { uid, lessonId, watchedPct: 0, completed: false, quizScore: null, quizTotal: null, completedAt: null, updatedAt: nowIso() };
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
  async removeMember(uid: string) { this.s.users = this.s.users.filter((u) => u.uid !== uid); this.save(); }
  async setMemberPlan(uid: string, plan: Plan, status: PlanStatus, planTrack: Track | null, note: string) {
    const u = this.s.users.find((x) => x.uid === uid);
    if (!u) throw new Error("MEMBER_NOT_FOUND");
    u.plan = plan; u.planStatus = plan === "free" ? "active" : status; u.planTrack = plan === "pro" ? (planTrack ?? u.track) : null; u.planNote = note;
    if (status === "active" && plan !== "free") {
      // an approved plan joins the learner to the programs it covers
      for (const p of this.s.programs) if (p.ownerId === u.ownerId && p.published && (plan === "premium" || (p.plan !== "premium" && p.track === u.planTrack)) && !u.enrolledProgramIds.includes(p.id)) u.enrolledProgramIds.push(p.id);
    }
    this.save(); this.emit();
    return structuredClone(u);
  }
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
    if (!s) { s = { ownerId, email: { fromName: "ELLP", fromAddress: "no-reply@example.com", replyTo: "", testMode: true, allowedRecipients: [] }, leaderboard: { visible: true, size: 10 }, ageRules: { ...DEFAULT_AGE_RULES }, lineUrl: "", paymentInstructions: { th: "", en: "" } }; this.s.settings.push(s); }
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
    this.save();
  }
  async resetDemo() { this.s = seed(); this.save(); this.emit(); }
}

export const demoApi: EllpApi = new DemoStore();
