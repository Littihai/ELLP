import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Bar, Button, Card, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import { ageBandOf, checkUnlock, programVisible } from "@/lib/gamification";
import { canAccessLesson, planCoversProgram } from "@/lib/access";
import { programComplete } from "@/lib/commerce";
import { Link as RLink } from "react-router-dom";

import { SkillChips, Thumb } from "./shared";
import { programSkills } from "@/lib/skills";

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
  // the programs for this learner's age (decision 0004); the others are counted so the hint can say a teacher may open them
  const visible = data.programs.filter((p) => programVisible(p, u));
  const hidden = data.programs.length - visible.length;
  const band = ageBandOf(u);

  return (
    <>
      <PageHeader pretitle={t("nav.programs")} title={t("programs.title")} sub={<>{t("programs.sub")}{band && <> · {t("age.band")}: {t(`age.band.${band}`)}</>}</>} />
      {hidden > 0 && <div className="small muted" style={{ marginBottom: 12 }}><Icon name="info" size={13} /> {t("age.hidden", { n: hidden })}</div>}
      <div className="grid-cards">
        {visible.map((p) => {
          const ls = data.lessons.filter((l) => l.programId === p.id);
          const done = ls.filter((l) => data.progress.find((x) => x.lessonId === l.id)?.completed).length;
          const enrolled = u.enrolledProgramIds.includes(p.id);
          return (
            <Card key={p.id} pad="0" style={{ overflow: "hidden" }}>
              <div style={{ height: 8, background: p.color }} />
              <div style={{ padding: "14px 16px" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="row" style={{ gap: 6 }}>
                    <Badge tone="neutral">{t(`track.${p.track}`)} · {p.cefr}</Badge>
                    <Badge tone={p.plan === "free" ? "ok" : planCoversProgram(u, p) ? "ok" : "warn"}>{t(`plan.${p.plan}`)}{p.plan !== "free" && !planCoversProgram(u, p) && ` · ${t("plan.preview")}`}</Badge>
                  </span>
                  <span className="small muted">{t("programs.lessonsN", { n: ls.length })}</span>
                </div>
                <h3 style={{ margin: "8px 0 4px", fontSize: "var(--text-lg)" }}>{pick(p.title)}</h3>
                <p className="muted" style={{ margin: 0, fontSize: "var(--text-sm)", minHeight: 42 }}>{pick(p.description)}</p>
                <div style={{ marginTop: 8 }}><SkillChips skills={programSkills(ls)} /></div>
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
      <PageHeader pretitle={<>{t(`track.${data.program.track}`)} · {data.program.cefr}{data.program.targetScore && <> · {data.program.targetScore}</>}</>} title={pick(data.program.title)} sub={pick(data.program.description)}
        actions={<>
          {!planCoversProgram(u, data.program) && <RLink to="/app/plan" className="btn btn-secondary btn-sm"><Icon name="lock" size={14} /> {t("plan.needed", { plan: t(`plan.${data.program.plan}`) })} · {t("plan.upgrade")}</RLink>}
          {programComplete(data.lessons, data.progress) && <RLink to="/app/certificates" className="btn btn-primary btn-sm"><Icon name="trophy" size={14} /> {t("cert.get")}</RLink>}
        </>} />
      <div className="stack" style={{ gap: 12 }}>
        {data.lessons.map((l) => {
          const p = data.progress.find((x) => x.lessonId === l.id);
          const allowed = canAccessLesson(u, data.program!, l, data.lessons);
          const unlocked = allowed && checkUnlock(l, u, data.progress, data.questRows).ok;
          const status = p?.completed ? "done" : p && p.watchedPct > 0 ? "inProgress" : "notStarted";
          return (
            <Link key={l.id} to={`/app/lessons/${l.id}`} className="lesson-card" data-locked={!unlocked}>
              <Thumb youtubeId={l.youtubeId} color={data.program!.color} duration={l.durationSec} locked={!unlocked} done={p?.completed} />
              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="eyebrow">{l.order}. {t("programs.lessons")}</span>
                  <Badge tone={!unlocked ? "neutral" : status === "done" ? "ok" : status === "inProgress" ? "warn" : "accent"}>
                    {!allowed ? <><Icon name="lock" size={11} />{t(`plan.${data.program!.plan}`)}</> : !unlocked ? <><Icon name="lock" size={11} />{t("programs.locked")}</> : t(`programs.${status}`)}
                  </Badge>
                </div>
                <h3>{pick(l.title)}</h3>
                <p>{pick(l.summary)}</p>
                <div className="row" style={{ marginTop: 8, gap: 12 }}>
                  <span className="small" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}><Icon name="zap" size={12} /> {t("lesson.xpReward", { xp: l.xpReward })}</span>
                  {l.quiz.length > 0 && <span className="small muted"><Icon name="checklist" size={12} /> {t("lesson.quiz")} ({l.quiz.length})</span>}
                  <SkillChips skills={l.skills} small />
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
