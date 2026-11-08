import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, EmptyState, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { api, type ActivityResult } from "@/services";
import { fmtDate } from "@/lib/format";
import { PLAN_RANK, effectivePlan } from "@/lib/access";
import { mockTimeLeftSec } from "@/lib/commerce";
import { CheerModal } from "./shared";
import type { MockAttempt, MockTest } from "@/types";

/** The tenant's mock tests with the learner's best result, and the start button (Premium). */
export function MockTestsPage() {
  const { user } = useAuth();
  const { t, pick, lang } = useI18n();
  const u = user!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [tests, attempts] = await Promise.all([u.ownerId ? api.mockTests(u.ownerId) : Promise.resolve([]), api.myMockAttempts()]);
    return { tests, attempts };
  }, [u.uid, u.plan, u.planStatus]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const canTake = (tst: MockTest) => u.role !== "learner" || PLAN_RANK[effectivePlan(u)] >= PLAN_RANK[tst.requiredPlan];
  const best = (id: string) => data.attempts.filter((a) => a.testId === id && a.submittedAt).sort((a, b) => b.scaled - a.scaled)[0];
  const open = (id: string) => data.attempts.find((a) => a.testId === id && !a.submittedAt);

  return (
    <>
      <PageHeader pretitle={t("nav.mock")} title={t("mock.title")} sub={t("mock.sub")} />
      {data.tests.length === 0 ? <EmptyState icon="checklist" title={t("app.none")} /> : (
        <div className="grid-cards">
          {data.tests.map((tst) => {
            const b = best(tst.id), o = open(tst.id), n = tst.sections.reduce((k, s) => k + s.questions.length, 0);
            return (
              <Card key={tst.id}>
                <div className="row" style={{ justifyContent: "space-between" }}><Badge tone="neutral">{t(`track.${tst.track}`)}</Badge><Badge tone={tst.requiredPlan === "premium" ? "warn" : "accent"}>{t(`plan.${tst.requiredPlan}`)}</Badge></div>
                <h3 style={{ margin: "8px 0 4px", fontSize: "var(--text-lg)" }}>{pick(tst.title)}</h3>
                <p className="muted small" style={{ margin: 0, minHeight: 40 }}>{pick(tst.description)}</p>
                <div className="row small muted" style={{ margin: "10px 0", gap: 12 }}><span><Icon name="clock" size={12} /> {t("mock.minutes", { n: tst.durationMin })}</span><span><Icon name="checklist" size={12} /> {t("mock.questionsN", { n })}</span><span>{t("mock.pass")}: {tst.scoring === "ielts" ? `Band ${tst.passMark}` : tst.scoring === "toeic" ? tst.passMark : `${tst.passMark} %`}</span></div>
                {b && <div className="small" style={{ marginBottom: 8 }}><Badge tone={b.passed ? "ok" : "warn"}>{b.scaledLabel} · {t(b.passed ? "mock.passed" : "mock.notPassed")}</Badge> <span className="muted">{fmtDate(b.submittedAt, lang)}</span></div>}
                {canTake(tst) ? <Link to={`/app/mock/${tst.id}`} className="btn btn-primary btn-sm">{o ? t("mock.resume") : t("mock.start")} <Icon name="arrowRight" size={14} /></Link>
                  : <Link to="/app/plan" className="btn btn-secondary btn-sm"><Icon name="lock" size={14} /> {t("mock.needPlan", { plan: t(`plan.${tst.requiredPlan}`) })}</Link>}
              </Card>
            );
          })}
        </div>
      )}
      {data.attempts.filter((a) => a.submittedAt).length > 0 && (
        <Card title={t("mock.history")} style={{ marginTop: 16 }}>
          <table className="table"><tbody>
            {data.attempts.filter((a) => a.submittedAt).map((a) => <tr key={a.id}><td className="small muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(a.submittedAt, lang, true)}</td><td>{pick(data.tests.find((x) => x.id === a.testId)?.title)}</td><td>{t("mock.raw", { raw: a.raw, total: a.total })}</td><td><Badge tone={a.passed ? "ok" : "warn"}>{a.scaledLabel}</Badge></td></tr>)}
          </tbody></table>
        </Card>
      )}
    </>
  );
}

/** One timed attempt: the clock, every question, submit (or auto-submit at zero), then the score report. */
export function MockRunPage() {
  const { testId = "" } = useParams();
  const { user, refresh } = useAuth();
  const { t, pick } = useI18n();
  const { toast } = useToast();
  const nav = useNavigate();
  const u = user!;
  const { data, error, loading, reload, setData } = useAsync(async () => {
    const tests = u.ownerId ? await api.mockTests(u.ownerId) : [];
    const test = tests.find((x) => x.id === testId) ?? null;
    if (!test) return { test: null, attempt: null as MockAttempt | null };
    const attempt = await api.startMockAttempt(testId);
    return { test, attempt };
  }, [testId]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [left, setLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [cheer, setCheer] = useState<ActivityResult | null>(null);
  const attempt = data?.attempt ?? null, test = data?.test ?? null;
  const done = !!attempt?.submittedAt;

  const submit = useCallback(async (timedOut: boolean) => {
    if (!attempt || busy || attempt.submittedAt) return;
    setBusy(true);
    try {
      const r = await api.submitMockAttempt(attempt.id, answers, timedOut);
      setData((d) => d && { ...d, attempt: r.attempt });
      refresh();
      if (timedOut) toast(t("mock.timeUp"), "warn");
      if (r.result.xpGained > 0) setCheer(r.result);
    } finally { setBusy(false); }
  }, [attempt, answers, busy, setData, refresh, toast, t]);

  // the clock
  useEffect(() => {
    if (!attempt || !test || done) return;
    const tick = () => { const s = mockTimeLeftSec(attempt, test); setLeft(s); if (s <= 0) submit(true); };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [attempt, test, done, submit]);

  // tab switches during a test are recorded (the strict profile's idea, without the pause)
  useEffect(() => {
    if (!attempt || done) return;
    const on = () => { if (document.hidden) api.reportViolation(null, "tab_switch", `mock:${attempt.testId}`).catch(() => undefined); };
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, [attempt, done]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error === "PLAN_REQUIRED" ? t("mock.needPlan", { plan: t("plan.premium") }) : error} onRetry={reload} />;
  if (!test || !attempt) return <ErrorBox message="TEST_NOT_FOUND" />;
  const total = test.sections.reduce((k, s) => k + s.questions.length, 0);
  const unanswered = total - Object.keys(answers).length;
  const mm = Math.floor((left ?? 0) / 60), ss = String((left ?? 0) % 60).padStart(2, "0");

  if (done) {
    return (
      <>
        <Link to="/app/mock" className="btn btn-ghost" style={{ marginBottom: 10 }}><Icon name="arrowLeft" size={14} /> {t("mock.title")}</Link>
        <PageHeader pretitle={t("mock.result")} title={pick(test.title)} />
        <Card style={{ textAlign: "center", marginBottom: 16 }}>
          <div className="eyebrow">{t("mock.scaled")} · {t(`mock.scoring.${test.scoring}`)}</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: attempt.passed ? "var(--tone-ok-solid)" : "var(--tone-warn-solid)", margin: "6px 0" }}>{attempt.scaledLabel}</div>
          <Badge tone={attempt.passed ? "ok" : "warn"}>{t(attempt.passed ? "mock.passed" : "mock.notPassed")} · {t("mock.pass")} {test.scoring === "ielts" ? `Band ${test.passMark}` : test.scoring === "toeic" ? test.passMark : `${test.passMark} %`}</Badge>
          <div className="muted" style={{ marginTop: 8 }}>{t("mock.raw", { raw: attempt.raw, total: attempt.total })}{attempt.timedOut && ` · ${t("mock.timeUp")}`}</div>
        </Card>
        <Card title={t("mock.bySection")}>
          <table className="table"><tbody>
            {attempt.sectionScores.map((s) => <tr key={s.sectionId}><td>{pick(test.sections.find((x) => x.id === s.sectionId)?.title)}</td><td style={{ textAlign: "right" }}>{s.raw}/{s.total}</td></tr>)}
          </tbody></table>
          <div className="row" style={{ marginTop: 14 }}>
            <Button variant="secondary" icon="sync" onClick={() => { setAnswers({}); nav("/app/mock"); }}>{t("mock.again")}</Button>
          </div>
        </Card>
        {cheer && <CheerModal result={cheer} onClose={() => setCheer(null)} />}
      </>
    );
  }

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", position: "sticky", top: "var(--hdr-h)", zIndex: 5, background: "var(--color-bg)", padding: "8px 0" }}>
        <div><div className="eyebrow">{pick(test.title)}</div><div className="small muted">{t("mock.proctored")}</div></div>
        <div className="row">
          <Badge tone={(left ?? 0) <= 60 ? "stop" : "accent"}><Icon name="clock" size={12} />{t("mock.timeLeft")} {mm}:{ss}</Badge>
          <Button icon="paperAirplane" busy={busy} onClick={() => { if (unanswered === 0 || window.confirm(t("mock.submitConfirm", { n: unanswered }))) submit(false); }}>{t("mock.submit")}</Button>
        </div>
      </div>
      <div className="stack" style={{ marginTop: 10 }}>
        {test.sections.map((s, si) => (
          <Card key={s.id} title={`${si + 1}. ${pick(s.title)}`}>
            <div className="stack" style={{ gap: 12 }}>
              {s.questions.map((q, qi) => (
                <div key={q.id} className="quiz-q">
                  <h4>{qi + 1}. {pick(q.prompt)} {answers[q.id] === undefined && <span className="small muted">({t("mock.unanswered")})</span>}</h4>
                  <div className="stack" style={{ gap: 8 }}>
                    {q.choices.map((c, ci) => (
                      <label key={ci} className="quiz-opt" data-picked={answers[q.id] === ci}>
                        <input type="radio" name={q.id} checked={answers[q.id] === ci} onChange={() => setAnswers((a) => ({ ...a, [q.id]: ci }))} /><span>{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
