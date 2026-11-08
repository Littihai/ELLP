import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Avatar, Badge, Button, Card, EmptyState, ErrorBox, Icon, Loading, PageHeader, StatCard } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import { levelInfo } from "@/lib/gamification";
import { recentWeeks } from "@/lib/family";
import { fmtDate } from "@/lib/format";
import { SkillBars } from "./shared";

/** The parent's page (1.4): the children, one child's week (with the week before for comparison), skills, the emailed report, consent. */
export function FamilyPage() {
  const { user } = useAuth();
  const { t, pick, lang } = useI18n();
  const { toast } = useToast();
  const u = user!;
  const { data: children, error, loading, reload } = useAsync(() => api.myChildren(), [u.uid]);
  const [childUid, setChildUid] = useState<string | null>(null);
  const weeks = recentWeeks(3);
  const [week, setWeek] = useState(weeks[0]);
  const current = childUid ?? children?.[0]?.uid ?? null;
  const { data: ov, loading: loadingOv, setData } = useAsync(() => (current ? api.childOverview(current, week) : Promise.resolve(null)), [current, week]);
  const [busy, setBusy] = useState(false);

  if (loading && !children) return <Loading />;
  if (error || !children) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  if (children.length === 0) return <><PageHeader pretitle={t("role.parent")} title={t("fam.title")} sub={t("fam.sub")} /><EmptyState icon="heart" title={t("fam.none")} action={<Link to="/app/contact" className="btn btn-secondary btn-sm">{t("fam.contact")}</Link>} /></>;

  const email = async () => {
    if (!current) return;
    setBusy(true);
    try { const m = await api.emailChildReport(current, week); toast(t("fam.emailed", { to: m.to, status: t(`mail.status.${m.status}`) }), m.status === "sent" ? "ok" : "warn"); } finally { setBusy(false); }
  };
  const consent = async () => {
    if (!current) return;
    const c = await api.confirmChildConsent(current);
    setData((d) => d && { ...d, child: c });
    toast(t("app.saved"), "ok");
    reload();
  };
  const diff = (a: number, b: number) => { const d = a - b; return d === 0 ? "±0" : d > 0 ? `+${d}` : `${d}`; };
  const weekLabel = (k: string, i: number) => (i === 0 ? t("fam.thisWeek") : i === 1 ? t("fam.lastWeek") : t("fam.weeksAgo", { n: i })) + ` (${k})`;

  return (
    <>
      <PageHeader pretitle={t("role.parent")} title={t("fam.title")} sub={t("fam.sub")} actions={<Link to="/app/contact" className="btn btn-secondary btn-sm"><Icon name="comment" size={14} /> {t("fam.contact")}</Link>} />
      <div className="row" style={{ gap: 10, marginBottom: 16 }}>
        {children.map((c) => (
          <button key={c.uid} type="button" className="row-click" aria-pressed={c.uid === current} onClick={() => setChildUid(c.uid)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px 8px 8px", borderRadius: 999, border: `2px solid ${c.uid === current ? "var(--color-accent)" : "var(--color-neutral-200)"}`, background: c.uid === current ? "var(--color-accent-100)" : "var(--color-surface)", font: "inherit", color: "inherit", cursor: "pointer" }}>
            <Avatar name={c.displayName} color={c.avatarColor} size={32} />
            <span style={{ textAlign: "left" }}><b style={{ display: "block" }}>{c.displayName}</b><span className="small muted">{t("app.levelN", { n: levelInfo(c.xp).level })} · {c.xp} XP · <Icon name="flame" size={11} /> {c.streakDays}</span></span>
          </button>
        ))}
      </div>

      {loadingOv && !ov && <Loading />}
      {ov && (
        <div className="stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="row" style={{ gap: 6 }}>
              <Icon name="calendar" size={14} /><span className="small muted">{t("fam.week")}:</span>
              {weeks.map((k, i) => <button key={k} type="button" className="chip" aria-pressed={k === week} onClick={() => setWeek(k)}>{weekLabel(k, i)}</button>)}
            </div>
            <span className="small muted">{ov.report.from} – {ov.report.to}</span>
          </div>
          <div className="grid-stats">
            <StatCard icon="zap" label={t("fam.xp")} value={ov.report.xp} sub={t("fam.vsPrev", { n: diff(ov.report.xp, ov.previous.xp) })} />
            <StatCard icon="checkCircle" label={t("fam.lessons")} value={ov.report.lessonsDone} sub={t("fam.vsPrev", { n: diff(ov.report.lessonsDone, ov.previous.lessonsDone) })} tone="ok" />
            <StatCard icon="checklist" label={t("fam.quizzes")} value={ov.report.quizzesPassed} tone="accent" />
            <StatCard icon="calendar" label={t("fam.days")} value={ov.report.activeDays} sub={t("fam.vsPrev", { n: diff(ov.report.activeDays, ov.previous.activeDays) })} tone="neutral" />
            <StatCard icon="clock" label={t("fam.minutes")} value={ov.report.minutes} sub={t("fam.vsPrev", { n: diff(ov.report.minutes, ov.previous.minutes) })} tone="warn" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <Card title={t("fam.summary")} actions={<Button size="sm" variant="secondary" icon="mail" busy={busy} onClick={email}>{t("fam.email")}</Button>}>
              <p style={{ margin: 0, fontSize: "var(--text-md)", lineHeight: 1.7 }}>{pick(ov.report.summary)}</p>
              <div className="small muted" style={{ marginTop: 8 }}><Icon name="info" size={12} /> {t("fam.summaryHint")}</div>
              <div className="row" style={{ marginTop: 12, gap: 6 }}>
                {ov.report.strongest && <Badge tone="ok"><Icon name="starFill" size={11} />{t(`skill.${ov.report.strongest}`)}</Badge>}
                {ov.report.weakest && <Badge tone="warn"><Icon name="lightBulb" size={11} />{t(`skill.${ov.report.weakest}`)}</Badge>}
                {ov.child.placementCefr && <Badge tone="accent"><Icon name="goal" size={11} />CEFR {ov.child.placementCefr}</Badge>}
              </div>
            </Card>
            <Card title={t("skill.title")}>
              <SkillBars rows={ov.report.skills} before={ov.placement?.bySkill ?? null} />
            </Card>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            <Card title={t("fam.recent")}>
              {ov.xp.length === 0 ? <div className="muted small">{t("home.noXp")}</div> : (
                <table className="table"><tbody>
                  {ov.xp.slice(0, 8).map((e) => <tr key={e.id}><td style={{ width: 90 }}><Badge tone={e.kind === "quest" ? "accent" : e.kind === "streak" ? "warn" : "ok"}>{t(`xp.${e.kind}`)}</Badge></td><td>{e.note}</td><td className="muted small" style={{ whiteSpace: "nowrap" }}>{fmtDate(e.at, lang)}</td><td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-accent-700)" }}>+{e.xp}</td></tr>)}
                </tbody></table>
              )}
            </Card>
            <div className="stack">
              <Card title={t("fam.programs")}>
                <div className="stack" style={{ gap: 8 }}>
                  {ov.programs.map((p) => {
                    const ls = ov.lessons.filter((l) => l.programId === p.id && l.published);
                    const done = ls.filter((l) => ov.progress.find((x) => x.lessonId === l.id)?.completed).length;
                    return <div key={p.id} className="row" style={{ justifyContent: "space-between" }}><span className="row" style={{ gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />{pick(p.title)}</span><span className="small muted">{t("programs.doneN", { done, total: ls.length })}</span></div>;
                  })}
                  {ov.certificates.map((c) => <div key={c.id} className="row small"><Icon name="trophy" size={13} color="var(--tone-warn-solid)" /> {t("fam.certificates")}: {pick(c.programTitle)} · <Link to={`/certificate/${c.code}`}>{c.code}</Link></div>)}
                </div>
              </Card>
              <Card title={t("age.consent")}>
                {ov.child.parentConsent.acknowledged
                  ? <div className="row"><Icon name="checkCircleFill" size={16} color="var(--tone-ok-solid)" /><span>{t("fam.consentDone", { at: fmtDate(ov.child.parentConsent.at, lang) })}{ov.child.parentConsent.note && <span className="small muted"> · {ov.child.parentConsent.note}</span>}</span></div>
                  : <div className="row" style={{ justifyContent: "space-between" }}><span className="small muted">{t("fam.consentHint")}</span><Button size="sm" icon="check" onClick={consent}>{t("fam.consent")}</Button></div>}
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
