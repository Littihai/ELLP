import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, EmptyState, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import { fmtDate } from "@/lib/format";
import { programComplete } from "@/lib/commerce";

/** The learner's certificates, and the programs that are complete but not yet certified. */
export function CertificatesPage() {
  const { user } = useAuth();
  const { t, pick, lang } = useI18n();
  const { toast } = useToast();
  const u = user!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [certs, programs, lessons, progress] = await Promise.all([api.myCertificates(), api.programs(u.ownerId), api.lessons(), api.myProgress()]);
    const ready = programs.filter((p) => u.enrolledProgramIds.includes(p.id) && programComplete(lessons.filter((l) => l.programId === p.id), progress) && !certs.some((c) => c.programId === p.id));
    return { certs, ready };
  }, [u.uid]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const issue = async (programId: string) => { const c = await api.issueCertificate(programId); toast(t("app.saved")); reload(); return c; };

  return (
    <>
      <PageHeader pretitle={t("nav.certificates")} title={t("cert.title")} sub={t("cert.sub")} />
      {data.ready.length > 0 && (
        <Card style={{ marginBottom: 16 }} title={t("cert.complete")}>
          <div className="stack" style={{ gap: 8 }}>
            {data.ready.map((p) => <div key={p.id} className="row" style={{ justifyContent: "space-between" }}><b>{pick(p.title)}</b><Button size="sm" icon="trophy" onClick={() => issue(p.id)}>{t("cert.get")}</Button></div>)}
          </div>
        </Card>
      )}
      {data.certs.length === 0 ? <EmptyState icon="trophy" title={t("app.none")} /> : (
        <div className="grid-cards">
          {data.certs.map((c) => (
            <Card key={c.id}>
              <div className="row" style={{ justifyContent: "space-between" }}><Badge tone="accent">{t(`track.${c.track}`)} · {c.cefr}</Badge><span className="small muted">{fmtDate(c.issuedAt, lang)}</span></div>
              <h3 style={{ margin: "8px 0 4px", fontSize: "var(--text-lg)" }}>{pick(c.programTitle)}</h3>
              <div className="small muted">{pick(c.ownerName)} · {t("cert.lessonsXp", { n: c.lessons, xp: c.xpEarned })}</div>
              <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
                <code className="small">{c.code}</code>
                <Link to={`/certificate/${c.code}`} className="btn btn-secondary btn-sm">{t("cert.view")} <Icon name="arrowRight" size={14} /></Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
