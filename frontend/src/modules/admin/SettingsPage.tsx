import { useEffect, useState } from "react";
import { useI18n } from "@/app/providers/I18nProvider";
import { Button, Card, ErrorBox, Field, Loading, PageHeader, Switch } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api, USE_DEMO } from "@/services";
import type { OwnerSettings } from "@/types";

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
  useEffect(() => { if (data) setS(data); }, [data]);
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
        <Card title={t("set.leaderboard")}>
          <div className="form-grid">
            <div className="row"><Switch checked={s.leaderboard.visible} onChange={(v) => setS({ ...s, leaderboard: { ...s.leaderboard, visible: v } })} /> {t("set.lbVisible")}</div>
            <Field label={t("set.lbSize")}><input className="input" type="number" min={3} max={50} value={s.leaderboard.size} onChange={(e) => setS({ ...s, leaderboard: { ...s.leaderboard, size: Math.max(3, parseInt(e.target.value || "10", 10) || 10) } })} /></Field>
          </div>
        </Card>
        <Card title={t("set.about")}>
          <div className="small muted">ELLP {t("app.version")} {__APP_VERSION__} · build {new Date(__BUILD_TIME__).toLocaleString()} · {USE_DEMO ? t("app.demoBadge") : "live"}</div>
          {USE_DEMO && api.resetDemo && <div style={{ marginTop: 10 }}><Button variant="danger" size="sm" icon="sync" onClick={reset}>{t("app.resetDemo")}</Button></div>}
        </Card>
      </div>
    </>
  );
}
