import { useState } from "react";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Loading, Modal, PageHeader, Switch } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { fmtDate, newId } from "@/lib/format";
import { PLANS, TRACKS, type MockScoring, type MockTest, type Plan, type Track } from "@/types";

const blank = (ownerId: string): MockTest => ({ id: "", ownerId, track: "toeic", title: { th: "", en: "" }, description: { th: "", en: "" }, durationMin: 10, scoring: "toeic", passMark: 600, requiredPlan: "premium", sections: [{ id: newId("s"), title: { th: "ส่วนที่ 1", en: "Section 1" }, questions: [] }], published: false });

/** The tenant's mock tests: sections and questions, the clock, the scale and the pass mark; the recent attempts below. */
export function MockTestsAdminPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, pick, lang } = useI18n();
  const { toast } = useToast();
  const { ownerId } = useScope();
  const oid = ownerId!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [tests, attempts, members] = await Promise.all([api.mockTests(oid), api.mockAttempts(oid), api.members(oid)]);
    return { tests, attempts, members };
  }, [oid]);
  const [edit, setEdit] = useState<MockTest | null>(null);
  const [confirm, setConfirm] = useState<MockTest | null>(null);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const save = async () => { if (!edit || !edit.title.th.trim()) return; await api.saveMockTest({ ...edit, title: { th: edit.title.th, en: edit.title.en || edit.title.th } }); setEdit(null); toast(t("app.saved")); reload(); };
  const remove = async () => { if (confirm) { await api.removeMockTest(confirm.id); setConfirm(null); toast(t("app.saved")); reload(); } };
  const num = (v: string, min: number) => Math.max(min, parseFloat(v || "0") || 0);
  const name = (uid: string) => data.members.find((m) => m.uid === uid)?.displayName ?? uid;

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("adm.mock")} sub={t("mock.sub")} actions={<Button icon="plus" onClick={() => setEdit(blank(oid))}>{t("amock.add")}</Button>} />
      {data.tests.length === 0 ? <EmptyState icon="checklist" title={t("app.none")} /> : (
        <Card pad="0">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t("les.title.th")}</th><th>{t("track")}</th><th>{t("amock.duration")}</th><th>{t("amock.scoring")}</th><th>{t("amock.passMark")}</th><th>{t("mock.questionsN", { n: "" })}</th><th>{t("amock.requiredPlan")}</th><th></th><th></th></tr></thead>
              <tbody>
                {data.tests.map((x) => (
                  <tr key={x.id}>
                    <td><b>{pick(x.title)}</b></td><td className="small">{t(`track.${x.track}`)}</td><td>{x.durationMin}</td><td className="small">{t(`mock.scoring.${x.scoring}`)}</td><td>{x.passMark}</td>
                    <td>{x.sections.reduce((k, s) => k + s.questions.length, 0)}</td><td><Badge tone="warn">{t(`plan.${x.requiredPlan}`)}</Badge></td>
                    <td><Badge tone={x.published ? "ok" : "neutral"}>{t(x.published ? "app.published" : "app.draft")}</Badge></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}><Button size="sm" variant="secondary" icon="pencil" onClick={() => setEdit(JSON.parse(JSON.stringify(x)))}>{t("app.edit")}</Button>{" "}<Button size="sm" variant="tertiary" icon="trash" onClick={() => setConfirm(x)} style={{ color: "var(--tone-stop-fg)" }}>{t("app.delete")}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card title={t("amock.attempts")} style={{ marginTop: 16 }}>
        {data.attempts.filter((a) => a.submittedAt).length === 0 ? <div className="muted small">{t("app.none")}</div> : (
          <table className="table"><tbody>
            {data.attempts.filter((a) => a.submittedAt).slice(0, 20).map((a) => <tr key={a.id}><td className="small muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(a.submittedAt, lang, true)}</td><td><b>{name(a.uid)}</b></td><td>{pick(data.tests.find((x) => x.id === a.testId)?.title)}</td><td>{a.raw}/{a.total}</td><td><Badge tone={a.passed ? "ok" : "warn"}>{a.scaledLabel}</Badge></td></tr>)}
          </tbody></table>
        )}
      </Card>

      {edit && (
        <Modal wide title={edit.id ? t("app.edit") : t("amock.add")} onClose={() => setEdit(null)} actions={<><Button variant="tertiary" onClick={() => setEdit(null)}>{t("app.cancel")}</Button><Button onClick={save} disabled={!edit.title.th.trim()}>{t("app.save")}</Button></>}>
          <div className="form-grid">
            <Field label={t("les.title.th")}><input className="input" value={edit.title.th} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, th: e.target.value } })} /></Field>
            <Field label={t("les.title.en")}><input className="input" value={edit.title.en} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, en: e.target.value } })} /></Field>
            <Field label={t("prg.desc.th")} span2><input className="input" value={edit.description.th} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, th: e.target.value } })} /></Field>
            <Field label={t("track")}><select className="input" value={edit.track} onChange={(e) => setEdit({ ...edit, track: e.target.value as Track })}>{TRACKS.map((tr) => <option key={tr} value={tr}>{t(`track.${tr}`)}</option>)}</select></Field>
            <Field label={t("amock.duration")}><input className="input" type="number" min={1} value={edit.durationMin} onChange={(e) => setEdit({ ...edit, durationMin: num(e.target.value, 1) })} /></Field>
            <Field label={t("amock.scoring")}><select className="input" value={edit.scoring} onChange={(e) => setEdit({ ...edit, scoring: e.target.value as MockScoring })}>{(["toeic", "ielts", "percent"] as MockScoring[]).map((s) => <option key={s} value={s}>{t(`mock.scoring.${s}`)}</option>)}</select></Field>
            <Field label={t("amock.passMark")}><input className="input" type="number" step={edit.scoring === "ielts" ? 0.5 : 5} value={edit.passMark} onChange={(e) => setEdit({ ...edit, passMark: num(e.target.value, 0) })} /></Field>
            <Field label={t("amock.requiredPlan")}><select className="input" value={edit.requiredPlan} onChange={(e) => setEdit({ ...edit, requiredPlan: e.target.value as Plan })}>{PLANS.map((p) => <option key={p} value={p}>{t(`plan.${p}`)}</option>)}</select></Field>
            <div className="row"><Switch checked={edit.published} onChange={(v) => setEdit({ ...edit, published: v })} /> {t("app.published")}</div>
          </div>
          <h3 style={{ margin: "20px 0 10px", fontSize: "var(--text-lg)" }}>{t("amock.sections")}</h3>
          <div className="stack" style={{ gap: 14 }}>
            {edit.sections.map((s, si) => {
              const setS = (patch: Partial<typeof s>) => setEdit({ ...edit, sections: edit.sections.map((x, j) => (j === si ? { ...x, ...patch } : x)) });
              return (
                <Card key={s.id} pad="12px 14px">
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <input className="input" placeholder={t("amock.sectionTitle")} value={s.title.th} onChange={(e) => setS({ title: { th: e.target.value, en: s.title.en || e.target.value } })} />
                    <Button size="sm" variant="tertiary" icon="trash" onClick={() => setEdit({ ...edit, sections: edit.sections.filter((_, j) => j !== si) })}>{t("app.delete")}</Button>
                  </div>
                  <div className="stack" style={{ gap: 10, marginTop: 10 }}>
                    {s.questions.map((q, qi) => {
                      const setQ = (patch: Partial<typeof q>) => setS({ questions: s.questions.map((x, j) => (j === qi ? { ...x, ...patch } : x)) });
                      return (
                        <div key={q.id} className="quiz-q">
                          <div className="form-grid">
                            <Field label={`${qi + 1}. ${t("les.prompt.th")}`} span2><input className="input" value={q.prompt.th} onChange={(e) => setQ({ prompt: { th: e.target.value, en: q.prompt.en || e.target.value } })} /></Field>
                            <Field label={t("les.choices")}><input className="input" value={q.choices.join(" | ")} onChange={(e) => setQ({ choices: e.target.value.split("|").map((x) => x.trim()) })} /></Field>
                            <div className="row" style={{ alignItems: "flex-end", gap: 8 }}>
                              <Field label={t("les.answer")}><input className="input" type="number" min={1} max={Math.max(1, q.choices.length)} value={q.answer + 1} onChange={(e) => setQ({ answer: Math.min(q.choices.length - 1, Math.max(0, parseInt(e.target.value || "1", 10) - 1)) })} /></Field>
                              <Button size="sm" variant="tertiary" icon="trash" onClick={() => setS({ questions: s.questions.filter((_, j) => j !== qi) })}>{t("app.delete")}</Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div><Button size="sm" variant="secondary" icon="plus" onClick={() => setS({ questions: [...s.questions, { id: newId("q"), prompt: { th: "", en: "" }, choices: ["", "", ""], answer: 0 }] })}>{t("les.addQuestion")}</Button></div>
                  </div>
                </Card>
              );
            })}
            <div><Button size="sm" variant="secondary" icon="plus" onClick={() => setEdit({ ...edit, sections: [...edit.sections, { id: newId("s"), title: { th: `ส่วนที่ ${edit.sections.length + 1}`, en: `Section ${edit.sections.length + 1}` }, questions: [] }] })}>{t("amock.addSection")}</Button></div>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title={t("app.delete")} onClose={() => setConfirm(null)} actions={<><Button variant="tertiary" onClick={() => setConfirm(null)}>{t("app.cancel")}</Button><Button variant="danger" icon="trash" onClick={remove}>{t("app.delete")}</Button></>}>
          <p><b>{pick(confirm.title)}</b></p><p className="muted">{t("app.confirmDelete")}</p>
        </Modal>
      )}
    </>
  );
}
