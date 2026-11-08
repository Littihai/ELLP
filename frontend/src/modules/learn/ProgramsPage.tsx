import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Bar, Button, Card, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import { checkUnlock } from "@/lib/gamification";
import { fmtDuration } from "@/lib/format";
import { ytThumb } from "./shared";

/** All programs of the learner's owner, with how far they got in each. */
export function ProgramsPage() {
  const { user, refresh } = useAuth();
  const { t, pick } = useI18n();
  const u = user!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [programs, lessons, progress] = await Promise.all([api.programs(u.ownerId), api.lessons(), api.myProgress()]);
    return { programs: programs.filter((p) => p.published), lessons: lessons.filter((l) => l.published), progress };
  }, [u.uid, u.enrolledProgramIds.length]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;

  return (
    <>
      <PageHeader pretitle={t("nav.programs")} title={t("programs.title")} sub={t("programs.sub")} />
      <div className="grid-cards">
        {data.programs.map((p) => {
          const ls = data.lessons.filter((l) => l.programId === p.id);
          const done = ls.filter((l) => data.progress.find((x) => x.lessonId === l.id)?.completed).length;
          const enrolled = u.enrolledProgramIds.includes(p.id);
          return (
            <Card key={p.id} pad="0" style={{ overflow: "hidden" }}>
              <div style={{ height: 8, background: p.color }} />
              <div style={{ padding: "14px 16px" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <Badge tone="neutral">{t(`programs.level.${p.level}`)}</Badge>
                  <span className="small muted">{t("programs.lessonsN", { n: ls.length })}</span>
                </div>
                <h3 style={{ margin: "8px 0 4px", fontSize: "var(--text-lg)" }}>{pick(p.title)}</h3>
                <p className="muted" style={{ margin: 0, fontSize: "var(--text-sm)", minHeight: 42 }}>{pick(p.description)}</p>
                <div style={{ margin: "12px 0 10px" }}>
                  <div className="small muted" style={{ marginBottom: 4 }}>{t("programs.doneN", { done, total: ls.length })}</div>
                  <Bar pct={ls.length ? (done / ls.length) * 100 : 0} tone={done === ls.length && ls.length > 0 ? "ok" : undefined} />
                </div>
                {enrolled
                  ? <Link to={`/app/programs/${p.id}`} className="btn btn-primary btn-sm">{t("programs.open")} <Icon name="arrowRight" size={14} /></Link>
                  : <Button size="sm" variant="secondary" icon="plus" onClick={() => api.enroll(p.id).then(() => refresh()).then(reload)}>{t("programs.enroll")}</Button>}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

/** One program: its lessons in order, each open or locked for this learner. */
export function ProgramPage() {
  const { programId = "" } = useParams();
  const { user } = useAuth();
  const { t, pick } = useI18n();
  const u = user!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [programs, lessons, progress, questRows] = await Promise.all([api.programs(u.ownerId), api.lessons(programId), api.myProgress(), api.myQuests()]);
    return { program: programs.find((p) => p.id === programId) ?? null, lessons: lessons.filter((l) => l.published), progress, questRows };
  }, [programId, u.uid, u.xp]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  if (!data.program) return <ErrorBox message="PROGRAM_NOT_FOUND" />;

  return (
    <>
      <Link to="/app/programs" className="btn btn-ghost" style={{ marginBottom: 10 }}><Icon name="arrowLeft" size={14} /> {t("app.back")}</Link>
      <PageHeader pretitle={t(`programs.level.${data.program.level}`)} title={pick(data.program.title)} sub={pick(data.program.description)} />
      <div className="stack" style={{ gap: 12 }}>
        {data.lessons.map((l) => {
          const p = data.progress.find((x) => x.lessonId === l.id);
          const unlocked = checkUnlock(l, u, data.progress, data.questRows).ok;
          const status = p?.completed ? "done" : p && p.watchedPct > 0 ? "inProgress" : "notStarted";
          return (
            <Link key={l.id} to={`/app/lessons/${l.id}`} className="lesson-card" data-locked={!unlocked}>
              <div className="thumb">
                <img src={ytThumb(l.youtubeId)} alt="" loading="lazy" />
                <span className="ov"><Icon name={p?.completed ? "checkCircleFill" : unlocked ? "play" : "lock"} size={26} /></span>
                <span className="dur">{fmtDuration(l.durationSec)}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="eyebrow">{l.order}. {t("programs.lessons")}</span>
                  <Badge tone={!unlocked ? "neutral" : status === "done" ? "ok" : status === "inProgress" ? "warn" : "accent"}>
                    {!unlocked ? <><Icon name="lock" size={11} />{t("programs.locked")}</> : t(`programs.${status}`)}
                  </Badge>
                </div>
                <h3>{pick(l.title)}</h3>
                <p>{pick(l.summary)}</p>
                <div className="row" style={{ marginTop: 8, gap: 12 }}>
                  <span className="small" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}><Icon name="zap" size={12} /> {t("lesson.xpReward", { xp: l.xpReward })}</span>
                  {l.quiz.length > 0 && <span className="small muted"><Icon name="checklist" size={12} /> {t("lesson.quiz")} ({l.quiz.length})</span>}
                  {p && p.watchedPct > 0 && !p.completed && <div style={{ flex: 1, minWidth: 90, maxWidth: 200 }}><Bar pct={p.watchedPct} /></div>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
