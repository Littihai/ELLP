import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/services";
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
}
const AuthContext = createContext<Ctx | null>(null);

export function isStaff(u: UserProfile | null): boolean {
  return !!u && (u.role === "superadmin" || u.role === "owner" || u.role === "admin");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    api.currentUser().then((u) => { if (alive) { setUser(u); setReady(true); } }).catch(() => { if (alive) setReady(true); });
    const off = api.onAuthChange((u) => { if (alive) setUser(u); });
    return () => { alive = false; off(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => { const u = await api.signIn(email, password); setUser(u); return u; }, []);
  const signOut = useCallback(async () => { await api.signOut(); setUser(null); }, []);
  const refresh = useCallback(async () => { setUser(await api.currentUser()); }, []);

  const value = useMemo(() => ({ user, ready, staff: isStaff(user), signIn, signOut, refresh }), [user, ready, signIn, signOut, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
