import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Bar, Button, Card, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { api, USE_DEMO, type ActivityResult } from "@/services";
import { WATCH_COMPLETE_PCT, lessonComplete, quizPassed } from "@/lib/gamification";
import type { Lesson, LessonProgress } from "@/types";
import { CheerModal, RuleRow, useUnlock } from "./shared";

/**
 * The lesson: the YouTube player (locked until the rules pass), the words, the quiz, and the next lesson.
 * Watch progress: the embedded player reports nothing to the page without the IFrame API, so a timer runs while the lesson
 * is open and counts toward the duration; the mark (80 %) credits the video. The "mark as watched" button is the demo
 * shortcut so a tester need not sit through the song.
 */
export function LessonPage() {
  const { lessonId = "" } = useParams();
  const { user, refresh } = useAuth();
  const { t, pick } = useI18n();
  const u = user!;
  const { data, error, loading, reload, setData } = useAsync(async () => {
    const [lessons, progress, questRows, quests] = await Promise.all([api.lessons(), api.myProgress(), api.myQuests(), u.ownerId ? api.quests(u.ownerId) : Promise.resolve([])]);
    const lesson = lessons.find((l) => l.id === lessonId) ?? null;
    return { lesson, siblings: lessons.filter((l) => l.programId === lesson?.programId && l.published).sort((a, b) => a.order - b.order), lessons, progress, questRows, quests };
  }, [lessonId, u.uid]);
  const [cheer, setCheer] = useState<ActivityResult | null>(null);
  const unlock = useUnlock(data?.lesson ?? undefined, u, data?.progress ?? [], data?.questRows ?? []);

  const applyResult = (r: ActivityResult) => {
    setData((d) => d && { ...d, progress: [...d.progress.filter((p) => p.lessonId !== r.progress.lessonId), r.progress] });
    refresh();
    if (r.xpGained > 0 || r.newBadges.length || r.questsCompleted.length) setCheer(r);
    else if (r.lessonCompleted) setCheer(r);
  };

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const { lesson } = data;
  if (!lesson) return <ErrorBox message="LESSON_NOT_FOUND" />;
  const progress = data.progress.find((p) => p.lessonId === lesson.id);
  const watched = progress?.watchedPct ?? 0;
  const canQuiz = watched >= WATCH_COMPLETE_PCT;
  const idx = data.siblings.findIndex((l) => l.id === lesson.id);
  const next = data.siblings[idx + 1];
  const done = lessonComplete(lesson, progress);

  return (
    <>
      <Link to={`/app/programs/${lesson.programId}`} className="btn btn-ghost" style={{ marginBottom: 10 }}><Icon name="arrowLeft" size={14} /> {t("lesson.backToProgram")}</Link>
      <PageHeader
        pretitle={`${t("programs.lessons")} ${lesson.order}`}
        title={pick(lesson.title)}
        sub={pick(lesson.summary)}
        actions={done ? <Badge tone="ok"><Icon name="checkCircleFill" size={12} />{t("lesson.complete")}</Badge> : <Badge tone="accent"><Icon name="zap" size={12} />{t("lesson.xpReward", { xp: lesson.xpReward })}</Badge>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: 20, alignItems: "start" }} className="lesson-grid">
        <div className="stack">
          <Player lesson={lesson} unlocked={unlock.ok} progress={progress} onResult={applyResult} />
          {unlock.ok && (
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div className="small muted" style={{ marginBottom: 4 }}>{t("lesson.watchedPct", { pct: watched })}</div>
                <Bar pct={watched} tone={canQuiz ? "ok" : undefined} />
              </div>
              <span className="small muted">{t("lesson.ytHint", { id: lesson.youtubeId })}</span>
            </div>
          )}
          {lesson.vocabulary.length > 0 && (
            <Card title={t("lesson.vocab")}><div className="vocab">{lesson.vocabulary.map((w) => <span key={w}>{w}</span>)}</div></Card>
          )}
          {unlock.ok && lesson.quiz.length > 0 && <Quiz lesson={lesson} progress={progress} enabled={canQuiz} onResult={applyResult} />}
        </div>
        <div className="stack">
          {lesson.unlock.length > 0 && (
            <Card title={t("lesson.unlockRules")}>
              <div className="stack" style={{ gap: 8 }}>{unlock.rows.map((r, i) => <RuleRow key={i} rule={r.rule} ok={r.ok} lessons={data.lessons} quests={data.quests} />)}</div>
            </Card>
          )}
          {next && (
            <Card title={t("lesson.next")}>
              <Link to={`/app/lessons/${next.id}`} className="row" style={{ color: "inherit" }}>
                <Icon name="chevronRight" size={16} /><span style={{ fontWeight: 600 }}>{next.order}. {pick(next.title)}</span>
              </Link>
            </Card>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 860px) { .lesson-grid { grid-template-columns: 1fr !important; } }`}</style>
      {cheer && <CheerModal result={cheer} onClose={() => setCheer(null)} />}
    </>
  );
}

function Player({ lesson, unlocked, progress, onResult }: { lesson: Lesson; unlocked: boolean; progress?: LessonProgress; onResult: (r: ActivityResult) => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const watchedRef = useRef(progress?.watchedPct ?? 0);
  useEffect(() => { watchedRef.current = Math.max(watchedRef.current, progress?.watchedPct ?? 0); }, [progress?.watchedPct]);

  // a watch timer: while the player is on screen, every 15 s of wall time counts toward the duration (live mode replaces this
  // with the IFrame API's real position); it stops once the mark is reached so it never over-credits
  useEffect(() => {
    if (!unlocked || !playing || watchedRef.current >= WATCH_COMPLETE_PCT) return;
    const tick = 15;
    const id = window.setInterval(() => {
      const pct = Math.min(100, watchedRef.current + Math.round((tick / Math.max(30, lesson.durationSec)) * 100));
      watchedRef.current = pct;
      api.recordWatch(lesson.id, pct).then(onResult).catch(() => undefined);
      if (pct >= WATCH_COMPLETE_PCT) window.clearInterval(id);
    }, tick * 1000);
    return () => window.clearInterval(id);
  }, [unlocked, playing, lesson.id, lesson.durationSec, onResult]);

  const mark = async () => {
    setBusy(true);
    try { onResult(await api.recordWatch(lesson.id, 100)); } finally { setBusy(false); }
  };

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="player">
        {unlocked ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${lesson.youtubeId}?rel=0&modestbranding=1`}
            title={lesson.title.en}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setPlaying(true)}
          />
        ) : (
          <div className="player-locked">
            <div>
              <Icon name="lock" size={40} />
              <h2>{t("lesson.lockedTitle")}</h2>
              <p>{t("lesson.lockedSub")}</p>
            </div>
          </div>
        )}
      </div>
      {unlocked && USE_DEMO && (progress?.watchedPct ?? 0) < WATCH_COMPLETE_PCT && (
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="small muted" style={{ flex: 1, minWidth: 200 }}>{t("lesson.markHint")}</span>
          <Button variant="secondary" size="sm" icon="checkCircle" busy={busy} onClick={mark}>{t("lesson.markWatched")}</Button>
        </div>
      )}
    </div>
  );
}

function Quiz({ lesson, progress, enabled, onResult }: { lesson: Lesson; progress?: LessonProgress; enabled: boolean; onResult: (r: ActivityResult) => void }) {
  const { t, pick } = useI18n();
  const [answers, setAnswers] = useState<(number | null)[]>(() => lesson.quiz.map(() => null));
  const [result, setResult] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);
  const total = lesson.quiz.length;
  const best = progress?.quizScore ?? null;
  const passed = best !== null && quizPassed(best, total);

  const submit = async () => {
    if (answers.some((a) => a === null)) return;
    setBusy(true);
    try {
      const r = await api.submitQuiz(lesson.id, answers as number[]);
      setResult(answers as number[]);
      onResult(r);
    } finally { setBusy(false); }
  };
  const retake = () => { setAnswers(lesson.quiz.map(() => null)); setResult(null); };
  const score = result ? lesson.quiz.reduce((n, q, i) => n + (result[i] === q.answer ? 1 : 0), 0) : null;

  return (
    <Card title={t("lesson.quiz")} actions={best !== null && <Badge tone={passed ? "ok" : "warn"}>{t("lesson.best")}: {best}/{total} · {t(passed ? "lesson.passed" : "lesson.notPassed")}</Badge>}>
      <p className="muted small" style={{ margin: "0 0 12px" }}>{enabled ? t("lesson.quizSub") : t("lesson.quizLocked")}</p>
      <div className="stack" style={{ gap: 12, opacity: enabled ? 1 : 0.55, pointerEvents: enabled ? "auto" : "none" }}>
        {lesson.quiz.map((q, qi) => (
          <div className="quiz-q" key={q.id}>
            <h4>{qi + 1}. {pick(q.prompt)}</h4>
            <div className="stack" style={{ gap: 8 }}>
              {q.choices.map((c, ci) => {
                const picked = answers[qi] === ci;
                const res = result ? (ci === q.answer ? "right" : picked ? "wrong" : undefined) : undefined;
                return (
                  <label key={ci} className="quiz-opt" data-picked={picked && !result} data-result={res}>
                    <input type="radio" name={`${lesson.id}-${q.id}`} checked={picked} disabled={!!result} onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? ci : v)))} />
                    <span style={{ flex: 1 }}>{c}</span>
                    {res === "right" && <Icon name="checkCircleFill" size={16} color="var(--tone-ok-solid)" />}
                    {res === "wrong" && <Icon name="x" size={16} color="var(--tone-stop-solid)" />}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        <div className="row" style={{ justifyContent: "space-between" }}>
          {score !== null ? <Badge tone={quizPassed(score, total) ? "ok" : "stop"}>{t("lesson.score", { score, total })} · {t(quizPassed(score, total) ? "lesson.passed" : "lesson.notPassed")}</Badge> : <span />}
          {result ? <Button variant="secondary" icon="sync" onClick={retake}>{t("lesson.retake")}</Button>
            : <Button icon="paperAirplane" busy={busy} disabled={answers.some((a) => a === null)} onClick={submit}>{t("lesson.submit")}</Button>}
        </div>
      </div>
    </Card>
  );
}
