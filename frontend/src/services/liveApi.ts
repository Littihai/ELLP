import type {
  Badge, ChatThread, InboxMessage, LeaderboardRow, Lesson, LessonProgress, MailLog, MessageReply, Owner, OwnerSettings, Program, Quest, QuestProgress,
  UserProfile, XpEvent,
} from "@/types";
import { API_BASE, type ActivityResult, type AdminStats, type EllpApi, type LeaderboardPeriod, type PublicProgram } from "./api";
import { firebaseSignIn, firebaseSignOut, firebaseSignUp, getIdToken, onFirebaseUser } from "./firebase";

/** The C# API's envelope (backend/Ellp.Api/Shared/Api/ApiResponse.cs). */
interface Envelope<T> { success: boolean; message: string; data: T; code?: string }

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const env = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !env || !env.success) throw new Error(env?.code ?? env?.message ?? `HTTP_${res.status}`);
  return env.data;
}

const get = <T,>(p: string) => call<T>("GET", p);
const post = <T,>(p: string, b?: unknown) => call<T>("POST", p, b);
const put = <T,>(p: string, b?: unknown) => call<T>("PUT", p, b);
const del = (p: string) => call<void>("DELETE", p);
const qs = (o: Record<string, string | null | undefined>) => {
  const e = Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "") as [string, string][];
  return e.length ? "?" + new URLSearchParams(e).toString() : "";
};

/** Firebase Auth signs the person in; every API call carries the Firebase ID token; the API keeps the profile and the data. */
export const liveApi: EllpApi = {
  mode: "live",
  async signIn(email, password) { await firebaseSignIn(email, password); return post<UserProfile>("/auth/session"); },
  /** Firebase creates the account; the API creates the profile with the details (and the pending plan request). */
  async signUp(input) {
    await firebaseSignUp(input.email, input.password);
    const { password: _pw, ...details } = input;
    return post<UserProfile>("/auth/register", details);
  },
  async signOut() { await firebaseSignOut(); },
  async currentUser() { const t = await getIdToken(); return t ? post<UserProfile>("/auth/session") : null; },
  onAuthChange(cb) { return onFirebaseUser(async (u) => cb(u ? await post<UserProfile>("/auth/session").catch(() => null) : null)); },

  publicOwners: () => get<Owner[]>("/public/owners"),
  publicPrograms: () => get<PublicProgram[]>("/public/programs"),
  publicProgram: (id) => get<{ program: Program; owner: Owner; lessons: Lesson[]; settings: OwnerSettings } | null>(`/public/programs/${id}`),
  chatThread: (ownerId, visitorKey) => get<ChatThread | null>(`/public/chat${qs({ ownerId, visitorKey })}`),
  chatSend: (ownerId, visitorKey, name, email, text) => post<ChatThread>("/public/chat", { ownerId, visitorKey, name, email, text }),

  owners: () => get<Owner[]>("/catalog/owners"),
  programs: (ownerId) => get<Program[]>(`/catalog/programs${qs({ ownerId })}`),
  lessons: (programId) => get<Lesson[]>(`/catalog/lessons${qs({ programId })}`),
  quests: (ownerId) => get<Quest[]>(`/catalog/quests${qs({ ownerId })}`),
  badges: () => get<Badge[]>("/catalog/badges"),

  myProgress: () => get<LessonProgress[]>("/me/progress"),
  myQuests: () => get<QuestProgress[]>("/me/quests"),
  myXpEvents: () => get<XpEvent[]>("/me/xp"),
  recordWatch: (lessonId, watchedPct) => post<ActivityResult>("/me/watch", { lessonId, watchedPct }),
  submitQuiz: (lessonId, answers) => post<ActivityResult>("/me/quiz", { lessonId, answers }),
  leaderboard: (programId, period: LeaderboardPeriod) => get<LeaderboardRow[]>(`/leaderboard${qs({ programId, period })}`),
  myMessages: () => get<InboxMessage[]>("/me/messages"),
  sendMessage: (subject, body) => post<InboxMessage>("/me/messages", { subject, body }),
  enroll: (programId) => post<UserProfile>("/me/enroll", { programId }),
  requestPlan: (plan, planTrack, note) => post<UserProfile>("/me/plan", { plan, planTrack, note }),

  members: (ownerId) => get<UserProfile[]>(`/admin/members${qs({ ownerId })}`),
  saveMember: (u) => post<UserProfile>("/admin/members", u),
  removeMember: (uid) => del(`/admin/members/${uid}`),
  setMemberPlan: (uid, plan, status, planTrack, note) => put<UserProfile>(`/admin/members/${uid}/plan`, { plan, status, planTrack, note }),
  chatThreads: (ownerId) => get<ChatThread[]>(`/admin/chat${qs({ ownerId })}`),
  chatReply: (id, text) => post<ChatThread>(`/admin/chat/${id}/reply`, { text }),
  chatSetStatus: (id, status, linkedUid) => put<ChatThread>(`/admin/chat/${id}/status`, { status, linkedUid: linkedUid ?? null }),
  saveProgram: (p) => post<Program>("/admin/programs", p),
  removeProgram: (id) => del(`/admin/programs/${id}`),
  saveLesson: (l) => post<Lesson>("/admin/lessons", l),
  removeLesson: (id) => del(`/admin/lessons/${id}`),
  saveQuest: (q) => post<Quest>("/admin/quests", q),
  removeQuest: (id) => del(`/admin/quests/${id}`),
  inbox: (ownerId) => get<InboxMessage[]>(`/admin/inbox${qs({ ownerId })}`),
  replyMessage: (id, body) => post<{ reply: MessageReply; mail: MailLog }>(`/admin/inbox/${id}/reply`, { body }),
  setMessageStatus: (id, status) => put<InboxMessage>(`/admin/inbox/${id}/status`, { status }),
  mailLog: (ownerId) => get<MailLog[]>(`/admin/mail${qs({ ownerId })}`),
  settings: (ownerId) => get<OwnerSettings>(`/admin/settings${qs({ ownerId })}`),
  saveSettings: (s) => put<OwnerSettings>("/admin/settings", s),
  adminStats: (ownerId) => get<AdminStats>(`/admin/stats${qs({ ownerId })}`),

  saveOwner: (o) => post<Owner>("/owners", o),
  removeOwner: (id) => del(`/owners/${id}`),
};
