import { useEffect } from "react";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, EmptyState, ErrorBox, Loading, PageHeader } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { fmtDate } from "@/lib/format";
import type { Violation } from "@/types";

/** The admins' view of the integrity ladder: what the players reported, who is signed in where, and pauses to lift. */
export function IntegrityPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, pick, lang } = useI18n();
  const { toast } = useToast();
  const { ownerId } = useScope();
  const { data, error, loading, reload } = useAsync(async () => {
    const [violations, sessions, members, lessons, settings] = await Promise.all([api.violations(ownerId!), api.sessions(ownerId!), api.members(ownerId!), api.lessons(), api.settings(ownerId!)]);
    return { violations, sessions, members, lessons, settings };
  }, [ownerId]);
  useEffect(() => { const id = window.setInterval(reload, 10000); return () => window.clearInterval(id); }, [reload]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const name = (uid: string) => data.members.find((m) => m.uid === uid)?.displayName ?? uid;
  const lessonName = (id: string | null) => (id ? pick(data.lessons.find((l) => l.id === id)?.title) || id : "—");
  const tone = (a: string) => (a === "paused" || a === "refused" ? "stop" : a === "warned" || a === "kicked_old" ? "warn" : "neutral");
  const pauseMs = data.settings.integrity.pauseMinutes * 60000;
  const pauses = data.violations.filter((v) => v.action === "paused" && Date.now() - new Date(v.at).getTime() < pauseMs);
  const lift = async (v: Violation) => { if (v.lessonId) { await api.liftPause(v.uid, v.lessonId); toast(t("app.saved")); reload(); } };

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("ig.title")} sub={t("ig.sub")} />
      <div className="small muted" style={{ marginBottom: 12 }}>{t("ig.honest")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Card title={t("ig.pauses")}>
          {pauses.length === 0 ? <div className="muted small">{t("app.none")}</div> : pauses.map((v) => (
            <div key={v.id} className="row" style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--color-neutral-100)" }}>
              <span><b>{name(v.uid)}</b> · {lessonName(v.lessonId)}<div className="small muted">{t("ig.until")} {fmtDate(new Date(new Date(v.at).getTime() + pauseMs).toISOString(), lang, true)}</div></span>
              <Button size="sm" variant="secondary" icon="unlock" onClick={() => lift(v)}>{t("ig.lift")}</Button>
            </div>
          ))}
        </Card>
        <Card title={t("ig.sessions")}>
          {data.sessions.length === 0 ? <div className="muted small">{t("app.none")}</div> : (
            <table className="table"><tbody>
              {data.sessions.map((s) => <tr key={s.id}><td><b>{name(s.uid)}</b></td><td className="small muted">{s.deviceLabel}</td><td className="small muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(s.lastSeenAt, lang, true)}</td></tr>)}
            </tbody></table>
          )}
        </Card>
      </div>
      <Card pad="0" title={undefined}>
        {data.violations.length === 0 ? <EmptyState icon="shieldLock" title={t("app.none")} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t("mail.when")}</th><th>{t("mem.name")}</th><th>{t("programs.lessons")}</th><th>{t("ig.events")}</th><th>{t("mail.status")}</th><th></th></tr></thead>
              <tbody>
                {data.violations.map((v) => (
                  <tr key={v.id}>
                    <td className="small muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(v.at, lang, true)}</td>
                    <td><b>{name(v.uid)}</b></td>
                    <td className="small">{lessonName(v.lessonId)}</td>
                    <td>{t(`integ.type.${v.type}`)}</td>
                    <td><Badge tone={tone(v.action)}>{t(`integ.action.${v.action}`)}</Badge></td>
                    <td className="small muted">{v.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
