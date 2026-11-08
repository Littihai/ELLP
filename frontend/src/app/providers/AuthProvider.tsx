import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, readSessionId } from "@/services";
import { useToast } from "@/components/ui/Toast";
import { tr } from "@/i18n/dict";
import type { UserProfile } from "@/types";

/**
 * Who is signed in. The profile comes from the data door (demo store or the API after Firebase Auth); `refresh` re-reads it
 * after an activity changed XP, streak or badges. `staff` is anyone who may open the admin console.
 */
interface Ctx {
  user: UserProfile | null;
  ready: boolean;
  staff: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** a one-line notice for the sign-in page (a session that was refused or ended), cleared when read */
  notice: string | null;
  clearNotice: () => void;
}
const AuthContext = createContext<Ctx | null>(null);

export function isStaff(u: UserProfile | null): boolean {
  return !!u && (u.role === "superadmin" || u.role === "owner" || u.role === "admin");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { toast } = useToast();
  const lang = () => (document.documentElement.lang === "en" ? "en" : "th") as "th" | "en";

  // 1.2: a learner holds a session per tab; the ladder may warn, end the old one or refuse; a heartbeat keeps it alive
  useEffect(() => {
    if (!user || user.role !== "learner") return;
    let alive = true;
    const label = `${/Mobile|Android|iPhone/i.test(navigator.userAgent) ? "phone" : "desktop"} · ${navigator.platform || "browser"}`;
    api.startSession(label).then((r) => {
      if (!alive) return;
      if (r.decision === "warn") toast(tr(lang(), "integ.sessionWarn"), "warn");
      if (r.decision === "kick_old") toast(tr(lang(), "integ.sessionKicked"), "warn");
    }).catch((e: unknown) => {
      if (!alive) return;
      if (e instanceof Error && e.message === "SESSION_REFUSED") { setNotice(tr(lang(), "login.sessionRefused")); setUser(null); }
    });
    const id = window.setInterval(() => {
      const sid = readSessionId();
      if (!sid) return;
      api.heartbeat(sid).catch((e: unknown) => { if (alive && e instanceof Error && e.message === "SESSION_ENDED") { setNotice(tr(lang(), "integ.sessionEnded")); setUser(null); } });
    }, 30000);
    return () => { alive = false; window.clearInterval(id); };
  }, [user?.uid, user?.role, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    api.currentUser().then((u) => { if (alive) { setUser(u); setReady(true); } }).catch(() => { if (alive) setReady(true); });
    const off = api.onAuthChange((u) => { if (alive) setUser(u); });
    return () => { alive = false; off(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => { const u = await api.signIn(email, password); setUser(u); return u; }, []);
  const signOut = useCallback(async () => { await api.signOut(); setUser(null); }, []);
  const refresh = useCallback(async () => { setUser(await api.currentUser()); }, []);

  const clearNotice = useCallback(() => setNotice(null), []);
  const value = useMemo(() => ({ user, ready, staff: isStaff(user), signIn, signOut, refresh, notice, clearNotice }), [user, ready, signIn, signOut, refresh, notice, clearNotice]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
