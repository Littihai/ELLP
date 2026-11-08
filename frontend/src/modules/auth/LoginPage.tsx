import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { isStaff, useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { useTheme } from "@/app/providers/ThemeProvider";
import { Avatar, Button, Icon, LangToggle } from "@/components/ui/kit";
import { DEMO_LEARNERS, DEMO_PASSWORD, DEMO_STAFF, USERS } from "@/data/seed";
import { USE_DEMO } from "@/services";

/**
 * Two sign-in doors on one component: `admin` is /admin/login (staff only), otherwise /login (learners). The form follows
 * TMCL-PR's login: one centred pill form that shakes and turns red when refused, green when accepted. In demo mode the
 * sample accounts sit under the form, each a click away.
 */
export function LoginPage({ admin = false }: { admin?: boolean }) {
  const { user, ready, signIn } = useAuth();
  const { t } = useI18n();
  const { resolved, toggle } = useTheme();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "wrong" | "ok">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (ready && user) return <Navigate to={isStaff(user) ? "/admin" : "/app"} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null); setState("idle");
    try {
      const u = await signIn(email, password);
      const staff = isStaff(u);
      if (admin && !staff) { setError(t("login.wrongDoor.admin")); setState("wrong"); await signOutQuiet(); return; }
      if (!admin && staff) { setError(t("login.wrongDoor.learner")); setState("wrong"); await signOutQuiet(); return; }
      setState("ok");
      window.setTimeout(() => nav(loc.state?.from ?? (admin ? "/admin" : "/app"), { replace: true }), 350);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(code === "ACCOUNT_DISABLED" ? t("login.disabled") : code === "FIREBASE_NOT_CONFIGURED" ? t("login.firebaseMissing") : t("login.failed"));
      setState("wrong");
    } finally {
      setBusy(false);
    }
  };
  const { signOut } = useAuth();
  const signOutQuiet = () => signOut().catch(() => undefined);

  const demoIds = admin ? DEMO_STAFF : DEMO_LEARNERS;
  const demo = USERS.filter((u) => demoIds.includes(u.uid));

  return (
    <div className="lg-page">
      <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <LangToggle />
        <button type="button" className="btn-icon" onClick={toggle} aria-label={t("app.theme")}><Icon name={resolved === "dark" ? "sun" : "moon"} size={18} /></button>
      </div>
      <div className="lg-stack">
        <form className="lg-form" data-state={state === "idle" ? undefined : state} onSubmit={submit} noValidate>
          <div className="lg-head">
            <span className="lg-pill"><Icon name={admin ? "shieldLock" : "play"} size={14} /> ELLP</span>
            <h1>{t(admin ? "login.adminTitle" : "login.learnerTitle")}</h1>
            <p className="lg-sub">{t(admin ? "login.adminSub" : "login.learnerSub")}</p>
          </div>
          <label className="lg-field">
            <Icon name="mail" size={16} />
            <input type="email" name="email" autoComplete="username" placeholder={t("login.email")} value={email} onChange={(e) => { setEmail(e.target.value); setState("idle"); }} required />
          </label>
          <label className="lg-field">
            <Icon name="lock" size={16} />
            <input type="password" name="password" autoComplete="current-password" placeholder={t("login.password")} value={password} onChange={(e) => { setPassword(e.target.value); setState("idle"); }} required />
          </label>
          {error && <p className="lg-error" role="alert">{error}</p>}
          <Button type="submit" className="lg-btn" size="lg" busy={busy} variant={state === "ok" ? "success" : "primary"}>{t("login.submit")} <Icon name="arrowRight" size={16} /></Button>
          <div style={{ textAlign: "center", fontSize: "var(--text-sm)" }}>
            <Link to={admin ? "/login" : "/admin/login"}>{t(admin ? "login.toLearner" : "login.toAdmin")}</Link>
          </div>
        </form>

        {USE_DEMO && (
          <div style={{ background: "var(--color-surface)", border: "1px dashed var(--color-neutral-300)", borderRadius: "var(--radius-xl)", padding: "14px 16px" }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{t("login.demoAccounts")}</div>
            <div className="lg-demo">
              {demo.map((u) => (
                <button key={u.uid} type="button" onClick={() => { setEmail(u.email); setPassword(DEMO_PASSWORD); setState("idle"); setError(null); }}>
                  <Avatar name={u.displayName} color={u.avatarColor} size={26} />
                  <span style={{ minWidth: 0 }}><b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.displayName}</b><span className="muted">{t(`role.${u.role}`)}</span></span>
                </button>
              ))}
            </div>
            <div className="small muted" style={{ marginTop: 8 }}>{t("login.demoPassword")}: <code>{DEMO_PASSWORD}</code></div>
          </div>
        )}
        <div className="small muted" style={{ textAlign: "center" }}>ELLP {t("app.version")} {__APP_VERSION__}</div>
      </div>
    </div>
  );
}
