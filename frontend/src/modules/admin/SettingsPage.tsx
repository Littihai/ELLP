import { useEffect, useState } from "react";
import { useI18n } from "@/app/providers/I18nProvider";
import { Button, Card, ErrorBox, Field, Loading, PageHeader, Switch } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api, USE_DEMO } from "@/services";
import type { AgeBand, AgeRule, OwnerSettings } from "@/types";
import { AGE_BANDS, DEFAULT_AGE_RULES } from "@/lib/gamification";
import { DEFAULT_POLICY } from "@/lib/integrity";

/** The tenant's outgoing email identity and test-mode guard, the leaderboard, and the build. */
export function SettingsPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { ownerId } = useScope();
  const { data, error, loading, reload } = useAsync(() => api.settings(ownerId!), [ownerId]);
  const [s, setS] = useState<OwnerSettings | null>(null);
  const [busy, setBusy] = useState(false);
  // a tenant saved before 1.0.1 has no age rules yet: the defaults fill the gap until the next save
  useEffect(() => { if (data) setS({ ...data, ageRules: { ...DEFAULT_AGE_RULES, ...(data.ageRules ?? {}) }, integrity: { ...DEFAULT_POLICY, ...(data.integrity ?? {}) } }); }, [data]);
  if (loading && !s) return <Loading />;
  if (error || !s) return <ErrorBox message={error ?? "?"} onRetry={reload} />;

  const save = async () => { setBusy(true); try { await api.saveSettings(s); toast(t("app.saved")); reload(); } finally { setBusy(false); } };
  const reset = async () => { if (api.resetDemo && window.confirm(t("app.resetDemoConfirm"))) { await api.resetDemo(); window.location.href = "/admin/login"; } };

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("set.title")} actions={<Button icon="check" busy={busy} onClick={save}>{t("app.save")}</Button>} />
      <div className="stack">
        <Card title={t("set.email")}>
          <p className="muted small" style={{ margin: "0 0 12px" }}>{t("set.emailHint")}</p>
          <div className="form-grid">
            <Field label={t("set.fromName")}><input className="input" value={s.email.fromName} onChange={(e) => setS({ ...s, email: { ...s.email, fromName: e.target.value } })} /></Field>
            <Field label={t("set.fromAddress")}><input className="input" type="email" value={s.email.fromAddress} onChange={(e) => setS({ ...s, email: { ...s.email, fromAddress: e.target.value } })} /></Field>
            <Field label={t("set.replyTo")}><input className="input" type="email" value={s.email.replyTo} onChange={(e) => setS({ ...s, email: { ...s.email, replyTo: e.target.value } })} /></Field>
            <Field label={t("set.allowed")}><input className="input" value={s.email.allowedRecipients.join(", ")} onChange={(e) => setS({ ...s, email: { ...s.email, allowedRecipients: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } })} /></Field>
            <div className="span-2">
              <div className="row"><Switch checked={s.email.testMode} onChange={(v) => setS({ ...s, email: { ...s.email, testMode: v } })} /> <b>{t("set.testMode")}</b></div>
              <div className="small muted" style={{ marginTop: 4 }}>{t("set.testModeHint")}</div>
            </div>
          </div>
        </Card>
        <Card title={t("chat.title")}>
          <div className="form-grid">
            <Field label={t("set.line")} hint={t("set.lineHint")}><input className="input" value={s.lineUrl ?? ""} onChange={(e) => setS({ ...s, lineUrl: e.target.value })} placeholder="https://line.me/R/ti/p/@..." /></Field>
            <Field label={t("set.payment") + " (ไทย)"} span2><textarea className="input" rows={2} value={s.paymentInstructions?.th ?? ""} onChange={(e) => setS({ ...s, paymentInstructions: { th: e.target.value, en: s.paymentInstructions?.en ?? "" } })} /></Field>
            <Field label={t("set.payment") + " (EN)"} span2><textarea className="input" rows={2} value={s.paymentInstructions?.en ?? ""} onChange={(e) => setS({ ...s, paymentInstructions: { th: s.paymentInstructions?.th ?? "", en: e.target.value } })} /></Field>
          </div>
        </Card>
        <Card title={t("set.leaderboard")}>
          <div className="form-grid">
            <div className="row"><Switch checked={s.leaderboard.visible} onChange={(v) => setS({ ...s, leaderboard: { ...s.leaderboard, visible: v } })} /> {t("set.lbVisible")}</div>
            <Field label={t("set.lbSize")}><input className="input" type="number" min={3} max={50} value={s.leaderboard.size} onChange={(e) => setS({ ...s, leaderboard: { ...s.leaderboard, size: Math.max(3, parseInt(e.target.value || "10", 10) || 10) } })} /></Field>
          </div>
        </Card>
        <Card title={t("age.rules")}>
          <p className="muted small" style={{ margin: "0 0 12px" }}>{t("age.rulesHint")}</p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t("age.band")}</th><th>{t("age.quizPass")}</th><th>{t("age.lbVisible")}</th><th>{t("age.streakFreeze")}</th></tr></thead>
              <tbody>
                {AGE_BANDS.map((b: AgeBand) => {
                  const r: AgeRule = s.ageRules[b];
                  const set = (patch: Partial<AgeRule>) => setS({ ...s, ageRules: { ...s.ageRules, [b]: { ...r, ...patch } } });
                  return (
                    <tr key={b}>
                      <td><b>{t(`age.band.${b}`)}</b></td>
                      <td style={{ width: 140 }}><input className="input" type="number" min={30} max={100} step={5} value={r.quizPassPct} onChange={(e) => set({ quizPassPct: Math.min(100, Math.max(30, parseInt(e.target.value || "60", 10) || 60)) })} /></td>
                      <td><Switch checked={r.leaderboardVisible} onChange={(v) => set({ leaderboardVisible: v })} ariaLabel={t("age.lbVisible")} /></td>
                      <td><Switch checked={r.streakFreeze} onChange={(v) => set({ streakFreeze: v })} ariaLabel={t("age.streakFreeze")} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title={t("ig.policy")}>
          <p className="muted small" style={{ margin: "0 0 12px" }}>{t("ig.policyHint")}</p>
          <div className="form-grid">
            {([["pauseAfterViolations", "ig.pauseAfter", 2, 10], ["pauseMinutes", "ig.pauseMinutes", 1, 1440], ["maxSessions", "ig.maxSessions", 1, 5], ["maxReplays", "ig.maxReplays", 0, 99], ["checkpointTimeLimitSec", "ig.cpTime", 10, 600], ["checkpointXp", "ig.cpXp", 0, 100]] as const).map(([k, label, min, max]) => (
              <Field key={k} label={t(label)}><input className="input" type="number" min={min} max={max} value={s.integrity[k]} onChange={(e) => setS({ ...s, integrity: { ...s.integrity, [k]: Math.min(max, Math.max(min, parseInt(e.target.value || String(min), 10) || min)) } })} /></Field>
            ))}
          </div>
          <div className="small muted" style={{ marginTop: 10 }}>{t("ig.honest")}</div>
        </Card>
        <Card title={t("set.about")}>
          <div className="small muted">ELLP {t("app.version")} {__APP_VERSION__} · build {new Date(__BUILD_TIME__).toLocaleString()} · {USE_DEMO ? t("app.demoBadge") : "live"}</div>
          {USE_DEMO && api.resetDemo && <div style={{ marginTop: 10 }}><Button variant="danger" size="sm" icon="sync" onClick={reset}>{t("app.resetDemo")}</Button></div>}
        </Card>
      </div>
    </>
  );
}
