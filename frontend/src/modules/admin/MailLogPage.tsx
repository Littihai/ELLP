import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Card, EmptyState, ErrorBox, Loading, PageHeader } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { fmtDate } from "@/lib/format";
import type { MailLog } from "@/types";

/** Every email the platform sent for this tenant, with what became of it. */
export function MailLogPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, lang } = useI18n();
  const { ownerId } = useScope();
  const { data, error, loading, reload } = useAsync(() => api.mailLog(ownerId!), [ownerId]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const tone = (s: MailLog["status"]) => (s === "sent" ? "ok" : s === "failed" ? "stop" : "warn");

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("mail.title")} sub={t("mail.sub")} />
      <Card pad="0">
        {data.length === 0 ? <EmptyState icon="mail" title={t("app.none")} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t("mail.when")}</th><th>{t("mail.to")}</th><th>{t("mail.subject")}</th><th>{t("mail.status")}</th></tr></thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id}>
                    <td className="small muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(m.at, lang, true)}</td>
                    <td>{m.to}</td>
                    <td><b>{m.subject}</b><div className="small muted" style={{ maxWidth: 520, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.body}</div></td>
                    <td><Badge tone={tone(m.status)}>{t(`mail.status.${m.status}`)}</Badge></td>
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
