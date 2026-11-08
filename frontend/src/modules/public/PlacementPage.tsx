import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Bar, Button, Card, EmptyState, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { api, visitorKey } from "@/services";
import { fmtDate } from "@/lib/format";
import { LEVEL_PASS_PCT } from "@/lib/placement";
import type { Owner, PlacementResult, Program } from "@/types";

/**
 * The placement test (1.4). Public at /placement: a visitor picks a provider, answers, and sees a level with recommended
 * programs; the result waits under the browser key and joins the account at sign-up. At /app/placement the signed-in
 * learner's result is saved to their profile. Answers never reach the browser: the store scores the test.
 */
export function PlacementPage() {
  const { user, refresh } = useAuth();
  const { t, pick, lang } = useI18n();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const inApp = !!user && user.role !== "parent";
  const { data: owners, loading: loadingOwners } = useAsync(() => (user?.ownerId ? api.owners() : api.publicOwners()), [user?.ownerId]);
  const ownerId = user?.ownerId ?? params.get("owner") ?? owners?.[0]?.id ?? "";
  const { data, error, loading, reload, setData } = useAsync(async () => {
    if (!ownerId) return null;
    const [test, programs, mine] = await Promise.all([api.publicPlacementTest(ownerId), inApp ? api.programs(ownerId) : api.publicPrograms().then((rows) => rows.map((r) => r.program)), inApp ? api.myPlacement() : Promise.resolve(null)]);
    return { test, programs: programs.filter((p) => p.ownerId === ownerId), result: mine };
  }, [ownerId, inApp]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setAnswers({}); setStarted(false); }, [ownerId]);

  if ((loadingOwners && !owners) || (loading && !data)) return <div className="page"><Loading /></div>;
  if (error) return <div className="page"><ErrorBox message={error} onRetry={reload} /></div>;
  const test = data?.test ?? null;
  const result = data?.result ?? null;
  const total = test?.questions.length ?? 0;
  const unanswered = total - Object.keys(answers).length;

  const submit = async () => {
    if (!test || unanswered > 0) return;
    setBusy(true);
    try {
      const r = await api.submitPlacement(ownerId, test.id, answers, user ? null : visitorKey());
      setData((d) => d && { ...d, result: r });
      setStarted(false); setAnswers({});
      if (inApp) { await refresh(); toast(t("plc.savedToProfile"), "ok"); }
    } finally { setBusy(false); }
  };

  const ownerPicker = !user && owners && owners.length > 1 && (
    <div className="row" style={{ gap: 6, marginBottom: 14 }}>
      <span className="small muted">{t("plc.pickOwner")}:</span>
      {owners.map((o: Owner) => <button key={o.id} type="button" className="chip" aria-pressed={o.id === ownerId} onClick={() => setParams({ owner: o.id })}>{pick(o.name)}</button>)}
    </div>
  );

  return (
    <div className={inApp ? undefined : "page"} style={inApp ? undefined : { maxWidth: 860 }}>
      <PageHeader pretitle={t("nav.placement")} title={t("plc.title")} sub={t("plc.sub")} />
      {ownerPicker}
      {!test && <EmptyState icon="goal" title={t("plc.none")} action={!user && <Link to="/catalog" className="btn btn-secondary btn-sm">{t("pub.catalog")}</Link>} />}

      {test && result && !started && <ResultView result={result} programs={data!.programs} inApp={inApp} onRetake={() => setStarted(true)} />}

      {test && !result && !started && (
        <Card>
          <h2 style={{ margin: "0 0 6px", fontSize: "var(--text-xl)" }}>{pick(test.title)}</h2>
          <p className="muted" style={{ margin: 0 }}>{pick(test.description)}</p>
          <div className="row small muted" style={{ margin: "10px 0 14px", gap: 12 }}><span><Icon name="checklist" size={12} /> {t("plc.questionsN", { n: total })}</span><span><Icon name="info" size={12} /> {t("plc.levelHint")}</span></div>
          <Button icon="play" onClick={() => setStarted(true)}>{t("plc.start")}</Button>
        </Card>
      )}

      {test && started && (
        <div className="stack" style={{ gap: 12 }}>
          {test.questions.map((q, i) => (
            <div key={q.id} className="quiz-q">
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <h4 style={{ margin: 0 }}>{i + 1}. {pick(q.prompt)}</h4>
                <span className="row" style={{ gap: 4 }}><Badge tone="neutral">{t(`skill.${q.skill}`)}</Badge><Badge tone="neutral">{q.cefr}</Badge></span>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {q.choices.map((c, ci) => (
                  <label key={ci} className="quiz-opt" data-picked={answers[q.id] === ci}>
                    <input type="radio" name={q.id} checked={answers[q.id] === ci} onChange={() => setAnswers((a) => ({ ...a, [q.id]: ci }))} /><span>{c}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="small muted">{unanswered > 0 ? t("plc.unanswered", { n: unanswered }) : ""}</span>
            <Button icon="paperAirplane" busy={busy} disabled={unanswered > 0} onClick={submit}>{t("plc.submit")}</Button>
          </div>
        </div>
      )}
      {!user && result && <div className="small muted" style={{ marginTop: 12 }}><Icon name="info" size={12} /> {t("plc.visitorKept")} · {t("plc.takenAt")} {fmtDate(result.submittedAt, lang, true)}</div>}
    </div>
  );
}

function ResultView({ result, programs, inApp, onRetake }: { result: PlacementResult; programs: Program[]; inApp: boolean; onRetake: () => void }) {
  const { t, pick } = useI18n();
  const rec = result.recommendedProgramIds.map((id) => programs.find((p) => p.id === id)).filter((p): p is Program => !!p);
  const pct = (raw: number, total: number) => (total > 0 ? Math.round((raw / total) * 100) : 0);
  return (
    <div className="stack">
      <Card style={{ textAlign: "center" }}>
        <div className="eyebrow">{t("plc.level")}</div>
        <div style={{ fontSize: 52, fontWeight: 800, color: "var(--color-accent)", lineHeight: 1.1, margin: "4px 0" }}>{result.cefr}</div>
        <div className="muted small">{t("mock.raw", { raw: result.raw, total: result.total })} · {t("plc.levelHint")}</div>
        <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
          <Button variant="secondary" size="sm" icon="sync" onClick={onRetake}>{t("plc.again")}</Button>
          {!inApp && <Link to={`/signup?owner=${result.ownerId}${rec[0] ? `&track=${rec[0].track}` : ""}`} className="btn btn-primary btn-sm">{t("plc.signUpCta")} <Icon name="arrowRight" size={14} /></Link>}
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Card title={t("plc.byLevel")}>
          <div className="stack" style={{ gap: 10 }}>
            {result.byLevel.map((l) => (
              <div key={l.cefr}>
                <div className="row small" style={{ justifyContent: "space-between", marginBottom: 3 }}><b>{l.cefr}</b><span className="muted">{l.raw}/{l.total}{pct(l.raw, l.total) >= LEVEL_PASS_PCT ? <> · <Icon name="checkCircleFill" size={11} color="var(--tone-ok-solid)" /></> : null}</span></div>
                <Bar pct={pct(l.raw, l.total)} tone={pct(l.raw, l.total) >= LEVEL_PASS_PCT ? "ok" : "warn"} />
              </div>
            ))}
          </div>
        </Card>
        <Card title={t("plc.bySkill")}>
          <div className="stack" style={{ gap: 10 }}>
            {result.bySkill.map((s) => (
              <div key={s.skill}>
                <div className="row small" style={{ justifyContent: "space-between", marginBottom: 3 }}><b>{t(`skill.${s.skill}`)}</b><span className="muted">{s.raw}/{s.total}</span></div>
                <Bar pct={pct(s.raw, s.total)} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title={t("plc.recommended")}>
        {rec.length === 0 ? <div className="muted small">{t("plc.noRecommend")} <Link to={inApp ? "/app/programs" : "/catalog"}>{t("pub.catalog")}</Link></div> : (
          <div className="grid-cards">
            {rec.map((p) => (
              <Card key={p.id} pad="0" style={{ overflow: "hidden" }}>
                <div style={{ height: 8, background: p.color }} />
                <div style={{ padding: "12px 14px" }}>
                  <div className="row" style={{ gap: 6 }}><Badge tone="neutral">{t(`track.${p.track}`)}</Badge><Badge tone="accent">{p.cefr}</Badge>{p.targetScore && <Badge tone="neutral">{p.targetScore}</Badge>}</div>
                  <h3 style={{ margin: "8px 0 4px", fontSize: "var(--text-lg)" }}>{pick(p.title)}</h3>
                  <p className="muted small" style={{ margin: "0 0 10px" }}>{pick(p.description)}</p>
                  <Link to={inApp ? `/app/programs/${p.id}` : `/catalog/${p.id}`} className="btn btn-secondary btn-sm">{t("pub.details")} <Icon name="chevronRight" size={14} /></Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
