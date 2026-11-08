import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Card, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import { fmtDuration } from "@/lib/format";
import { Thumb } from "@/modules/learn/shared";

/** One program for a visitor: what it is, who it is for, its lessons (the first one plays here), the plan it needs, how to start. */
export function PublicProgramPage() {
  const { programId = "" } = useParams();
  const { user } = useAuth();
  const { t, pick } = useI18n();
  const { data, error, loading, reload } = useAsync(() => api.publicProgram(programId), [programId]);
  if (loading && data === null && !error) return <Loading />;
  if (error) return <div className="page"><ErrorBox message={error} onRetry={reload} /></div>;
  if (!data) return <div className="page"><ErrorBox message="PROGRAM_NOT_FOUND" /></div>;
  const { program: p, owner, lessons } = data;
  const preview = lessons[0];

  return (
    <div className="page">
      <Link to="/catalog" className="btn btn-ghost" style={{ marginBottom: 10 }}><Icon name="arrowLeft" size={14} /> {t("pub.catalog")}</Link>
      <PageHeader
        pretitle={<>{t(`track.${p.track}`)} · {p.cefr}{p.targetScore && <> · {p.targetScore}</>}</>}
        title={pick(p.title)}
        sub={<>{pick(p.description)} <span className="muted">· {t("pub.by")} {pick(owner.name)}</span></>}
        actions={<Badge tone={p.plan === "free" ? "ok" : p.plan === "pro" ? "accent" : "warn"}>{t("plan")}: {t(`plan.${p.plan}`)}</Badge>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: 20, alignItems: "start" }} className="lesson-grid">
        <div className="stack">
          {preview && (
            <div className="player">
              {preview.youtubeId ? (
                <iframe src={`https://www.youtube-nocookie.com/embed/${preview.youtubeId}?rel=0&modestbranding=1`} title={preview.title.en} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : (
                <div className="player-locked"><div><Icon name="video" size={40} /><h2>{pick(preview.title)}</h2><p>{t("pub.noVideoYet")}</p></div></div>
              )}
            </div>
          )}
          <div className="small muted"><Icon name="info" size={13} /> {t("pub.previewHint")}</div>
          <Card title={t("pub.lessons")}>
            <div className="stack" style={{ gap: 10 }}>
              {lessons.map((l, i) => (
                <div key={l.id} className="lesson-card" style={{ boxShadow: "none" }}>
                  <Thumb youtubeId={l.youtubeId} color={p.color} duration={l.durationSec} locked={i > 0} />
                  <div>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span className="eyebrow">{l.order}. {t("programs.lessons")}</span>
                      {i === 0 ? <Badge tone="ok">{t("plan.previewBadge")}</Badge> : p.plan !== "free" ? <Badge tone="neutral"><Icon name="lock" size={11} />{t(`plan.${p.plan}`)}</Badge> : <Badge tone="neutral"><Icon name="lock" size={11} />{t("pub.signIn")}</Badge>}
                    </div>
                    <h3>{pick(l.title)}</h3>
                    <p>{pick(l.summary)}</p>
                    <div className="row small muted" style={{ marginTop: 6, gap: 12 }}><span><Icon name="clock" size={12} /> {fmtDuration(l.durationSec)}</span><span><Icon name="zap" size={12} /> {l.xpReward} XP</span>{l.quiz.length > 0 && <span><Icon name="checklist" size={12} /> {l.quiz.length}</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="stack">
          <Card title={t("pub.forAges")}>
            <div className="row">{p.ageBands.length === 0 ? <Badge tone="accent">{t("age.forAll")}</Badge> : p.ageBands.map((b) => <Badge key={b} tone="accent">{t(`age.band.${b}`)}</Badge>)}</div>
          </Card>
          <Card title={t("plan")}>
            <p style={{ margin: "0 0 6px" }}><b>{t(`plan.${p.plan}`)}</b> · <span className="muted small">{t(`plan.${p.plan}.desc`)}</span></p>
            <p className="small muted" style={{ margin: 0 }}>{t("plan.preview")}</p>
            <div className="stack" style={{ gap: 8, marginTop: 14 }}>
              {user ? <Link to={`/app/programs/${p.id}`} className="btn btn-primary">{t("programs.open")} <Icon name="arrowRight" size={14} /></Link>
                : <><Link to={`/signup?owner=${owner.id}&track=${p.track}&plan=${p.plan}`} className="btn btn-primary">{t("pub.signUp")}</Link><Link to="/login" className="btn btn-secondary">{t("pub.signIn")}</Link></>}
            </div>
            <div className="small muted" style={{ marginTop: 10 }}>{t("su.adminHint")}</div>
          </Card>
        </div>
      </div>
      <style>{`@media (max-width: 860px) { .lesson-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
