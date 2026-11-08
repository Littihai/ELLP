import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/app/providers/I18nProvider";
import { Avatar, Badge, Button, Card, EmptyState, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { fmtDate } from "@/lib/format";

/** Weekly reports to parents (1.4): who the parents are, which children they follow, when the last email went, and the send-all button. */
export function ReportsAdminPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { ownerId } = useScope();
  const oid = ownerId!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [members, mail] = await Promise.all([api.members(oid), api.mailLog(oid)]);
    return { parents: members.filter((m) => m.role === "parent"), members, mail: mail.filter((m) => m.subject.startsWith("รายงานประจำสัปดาห์")) };
  }, [oid]);
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const sendAll = async () => {
    setBusy(true);
    try { const sent = await api.sendWeeklyReports(oid); toast(t("arep.sent", { n: sent.length }), sent.some((m) => m.status === "sent") ? "ok" : "warn"); reload(); } finally { setBusy(false); }
  };
  const lastMail = (email: string) => data.mail.find((m) => m.to.toLowerCase() === email.toLowerCase());

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("arep.title")} sub={t("arep.sub")} actions={<Button icon="mail" busy={busy} disabled={data.parents.length === 0} onClick={sendAll}>{t("arep.sendAll")}</Button>} />
      <div className="small muted" style={{ marginBottom: 12 }}><Icon name="info" size={13} /> {t("arep.schedule")} · <Link to="/admin/mail">{t("adm.mail")}</Link></div>
      <Card title={t("arep.parents")} pad="0">
        {data.parents.length === 0 ? <EmptyState icon="heart" title={t("arep.noParents")} action={<Link to="/admin/members" className="btn btn-secondary btn-sm">{t("adm.members")}</Link>} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th></th><th>{t("mem.name")}</th><th>{t("mem.children")}</th><th>{t("arep.lastMail")}</th><th>{t("app.active")}</th></tr></thead>
              <tbody>
                {data.parents.map((p) => {
                  const m = lastMail(p.email);
                  return (
                    <tr key={p.uid}>
                      <td><Avatar name={p.displayName} color={p.avatarColor} size={32} /></td>
                      <td><b>{p.displayName}</b><div className="small muted">{p.email}</div></td>
                      <td className="small">{p.childUids.map((id) => data.members.find((x) => x.uid === id)?.displayName ?? id).join(", ") || "—"}</td>
                      <td className="small">{m ? <>{fmtDate(m.at, lang, true)} · <Badge tone={m.status === "sent" ? "ok" : m.status === "failed" ? "stop" : "warn"}>{t(`mail.status.${m.status}`)}</Badge></> : <span className="muted">—</span>}</td>
                      <td><Badge tone={p.active ? "ok" : "stop"}>{t(p.active ? "app.active" : "app.inactive")}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
