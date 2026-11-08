import type {
  Badge, InboxMessage, LeaderboardRow, Lesson, LessonProgress, MailLog, MessageReply, Owner, OwnerSettings, Program, Quest, QuestProgress,
  UserProfile, XpEvent,
} from "@/types";
import {
  BADGES, DEMO_PASSWORD, LESSONS, MAIL_LOG, MESSAGES, OWNERS, OWNER_SETTINGS, PROGRAMS, PROGRESS, QUESTS, QUEST_PROGRESS, USERS, XP_EVENTS,
} from "@/data/seed";
import {
  WATCH_COMPLETE_PCT, dayKey, levelFor, lessonComplete, nextStreak, periodKeyFor, quizPassed, quizXp, streakBonus, weekKey,
} from "@/lib/gamification";
import { newId, nowIso } from "@/lib/format";
import type { ActivityResult, AdminStats, EllpApi, LeaderboardPeriod } from "./api";

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
  sessionUid: string | null;
}

const KEY = "ellp.demo.v1";

function seed(): State {
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
  return {
    owners: clone(OWNERS), programs: clone(PROGRAMS), lessons: clone(LESSONS), quests: clone(QUESTS), badges: clone(BADGES), users: clone(USERS),
    progress: clone(PROGRESS), questProgress: clone(QUEST_PROGRESS), xpEvents: clone(XP_EVENTS), messages: clone(MESSAGES), mail: clone(MAIL_LOG),
    settings: clone(OWNER_SETTINGS), sessionUid: null,
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
    if (!u || password !== DEMO_PASSWORD) throw new Error("INVALID_CREDENTIALS");
    if (!u.active) throw new Error("ACCOUNT_DISABLED");
    this.s.sessionUid = u.uid;
    this.save(); this.emit();
    return structuredClone(u);
  }
  async signOut() { this.s.sessionUid = null; this.save(); this.emit(); }
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

  /** First activity of the day: the streak moves and pays its bonus; the streak quests advance. */
  private touchDay(me: UserProfile, out: ActivityResult) {
    const today = dayKey();
    const n = nextStreak(me.streakDays, me.lastActiveDate, today);
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
    if (p.completed || !lessonComplete(lesson, p)) return;
    p.completed = true; p.completedAt = nowIso();
    out.lessonCompleted = true;
    this.giveBadge(me, "bdg_first", out);
  }

  private newResult(p: LessonProgress, me: UserProfile): ActivityResult {
    return { progress: p, xpGained: 0, events: [], levelBefore: levelFor(me.xp), levelAfter: levelFor(me.xp), newBadges: [], questsCompleted: [], lessonCompleted: false };
  }

  async recordWatch(lessonId: string, watchedPct: number): Promise<ActivityResult> {
    await delay(80);
    const me = this.me();
    const lesson = this.s.lessons.find((l) => l.id === lessonId);
    if (!lesson) throw new Error("LESSON_NOT_FOUND");
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
    const passedBefore = bestBefore >= 0 && quizPassed(bestBefore, total);
    if (quizPassed(correct, total) && !passedBefore) this.advanceQuests(me, "pass_quizzes", 1, false, lesson.programId, out);
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
    if (!s) { s = { ownerId, email: { fromName: "ELLP", fromAddress: "no-reply@example.com", replyTo: "", testMode: true, allowedRecipients: [] }, leaderboard: { visible: true, size: 10 } }; this.s.settings.push(s); }
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
    this.save();
  }
  async resetDemo() { this.s = seed(); this.save(); this.emit(); }
}

export const demoApi: EllpApi = new DemoStore();
