import { Link } from "react-router-dom";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Card, EmptyState, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { fmtDate } from "@/lib/format";

/** The certificates this tenant issued, each with its public verification link. */
export function CertificatesAdminPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, pick, lang } = useI18n();
  const { ownerId } = useScope();
  const { data, error, loading, reload } = useAsync(() => api.certificates(ownerId!), [ownerId]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("adm.certificates")} sub={t("acert.sub")} />
      <Card pad="0">
        {data.length === 0 ? <EmptyState icon="trophy" title={t("app.none")} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t("cert.issued")}</th><th>{t("mem.name")}</th><th>{t("adm.programs")}</th><th>{t("track")}</th><th>{t("cert.code")}</th><th></th></tr></thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td className="small muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(c.issuedAt, lang)}</td>
                    <td><b>{c.learnerName}</b></td>
                    <td>{pick(c.programTitle)}</td>
                    <td><Badge tone="neutral">{t(`track.${c.track}`)} · {c.cefr}</Badge></td>
                    <td><code className="small">{c.code}</code></td>
                    <td style={{ textAlign: "right" }}><Link to={`/certificate/${c.code}`} className="btn btn-secondary btn-sm" target="_blank">{t("cert.view")} <Icon name="arrowRight" size={14} /></Link></td>
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
