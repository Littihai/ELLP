import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { isStaff, useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Button, Card, ErrorBox, Field, Icon, Loading } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import { ageOf } from "@/lib/gamification";
import { PLANS, TRACKS, type Plan, type Track } from "@/types";

/** Self-service sign-up: who, which school, what goal, which plan. Free is live at once; pro/premium become a pending request. */
export function SignupPage() {
  const { user, ready, refresh } = useAuth();
  const { t, pick } = useI18n();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { data: owners, error: ownersError, loading } = useAsync(() => api.publicOwners(), []);
  const [form, setForm] = useState({
    displayName: "", email: "", password: "", birthYear: "" as string, track: (params.get("track") as Track) || "foundation",
    ownerId: params.get("owner") ?? "", plan: (params.get("plan") as Plan) || "free", planTrack: null as Track | null, note: "", consent: false, terms: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (ready && user) return <Navigate to={isStaff(user) ? "/admin" : "/app"} replace />;
  if (loading && !owners) return <Loading />;
  if (ownersError || !owners) return <div className="page"><ErrorBox message={ownersError ?? "?"} /></div>;
  const ownerId = form.ownerId || owners[0]?.id || "";
  const birthYear = form.birthYear ? parseInt(form.birthYear, 10) : null;
  const age = ageOf(birthYear);
  const minor = age !== null && age < 18;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.displayName.trim() || !form.email.trim() || form.password.length < 6 || !form.terms) { setError(t("su.invalid")); return; }
    if (minor && !form.consent) { setError(t("su.consentNeeded")); return; }
    setBusy(true);
    try {
      await api.signUp({ displayName: form.displayName, email: form.email, password: form.password, birthYear, track: form.track, ownerId, plan: form.plan, planTrack: form.plan === "pro" ? (form.planTrack ?? form.track) : null, note: form.note });
      await refresh();
      nav("/app", { replace: true });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(code === "EMAIL_TAKEN" ? t("su.emailTaken") : code === "FIREBASE_NOT_CONFIGURED" ? t("login.firebaseMissing") : t("su.invalid"));
    } finally { setBusy(false); }
  };

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="lg-head" style={{ marginBottom: 20 }}>
        <span className="lg-pill"><Icon name="play" size={14} /> ELLP</span>
        <h1 style={{ margin: 0, fontSize: "var(--text-2xl)" }}>{t("su.title")}</h1>
        <p className="lg-sub">{t("su.sub")}</p>
      </div>
      <Card>
        <form onSubmit={submit} className="form-grid" noValidate>
          <Field label={t("su.name")}><input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required /></Field>
          <Field label={t("login.email")}><input className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label={t("su.password")}><input className="input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></Field>
          <Field label={t("su.birthYear")} hint={age !== null ? t("age.years", { n: age }) : t("age.birthYearHint")}>
            <input className="input" type="number" min={1940} max={new Date().getFullYear()} value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })} />
          </Field>
          <Field label={t("su.owner")}>
            <select className="input" value={ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>{owners.map((o) => <option key={o.id} value={o.id}>{pick(o.name)}</option>)}</select>
          </Field>
          <Field label={t("track")}>
            <select className="input" value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value as Track })}>{TRACKS.map((tr) => <option key={tr} value={tr}>{t(`track.${tr}`)}</option>)}</select>
          </Field>
          <Field label={t("plan")} span2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {PLANS.map((pl) => (
                <button key={pl} type="button" onClick={() => setForm({ ...form, plan: pl })} aria-pressed={form.plan === pl}
                  style={{ textAlign: "left", padding: "12px 14px", borderRadius: "var(--radius-lg)", border: `2px solid ${form.plan === pl ? "var(--color-accent)" : "var(--color-neutral-200)"}`, background: form.plan === pl ? "var(--color-accent-100)" : "var(--color-surface)", font: "inherit", color: "inherit" }}>
                  <b>{t(`plan.${pl}`)}</b>
                  <div className="small muted" style={{ marginTop: 4 }}>{t(`plan.${pl}.desc`)}</div>
                </button>
              ))}
            </div>
          </Field>
          {form.plan === "pro" && (
            <Field label={t("plan.chooseTrack")}>
              <select className="input" value={form.planTrack ?? form.track} onChange={(e) => setForm({ ...form, planTrack: e.target.value as Track })}>{TRACKS.map((tr) => <option key={tr} value={tr}>{t(`track.${tr}`)}</option>)}</select>
            </Field>
          )}
          {form.plan !== "free" && <Field label={t("plan.note")} span2><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>}
          {minor && <label className="row span-2" style={{ cursor: "pointer" }}><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} /> {t("su.consent")}</label>}
          <label className="row span-2" style={{ cursor: "pointer" }}><input type="checkbox" checked={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.checked })} required /> {t("su.terms")}</label>
          {error && <div className="span-2 field-error" role="alert">{error}</div>}
          <div className="span-2 row" style={{ justifyContent: "space-between" }}>
            <Link to="/login">{t("su.haveAccount")}</Link>
            <Button type="submit" size="lg" busy={busy}>{t("su.submit")} <Icon name="arrowRight" size={16} /></Button>
          </div>
          <div className="span-2 small muted">{t("su.adminHint")}</div>
        </form>
      </Card>
    </div>
  );
}
