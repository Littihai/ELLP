import { useState } from "react";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Loading, Modal, PageHeader, Switch } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { fmtDate, newId } from "@/lib/format";
import { CEFR_LEVELS, SKILLS, type Cefr, type PlacementTest, type Skill } from "@/types";

const blank = (ownerId: string): PlacementTest => ({ id: "", ownerId, title: { th: "", en: "" }, description: { th: "", en: "" }, questions: [], published: false });

/** The tenant's placement tests (questions tagged by skill and level) and the recent results (1.4). */
export function PlacementAdminPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, pick, lang } = useI18n();
  const { toast } = useToast();
  const { ownerId } = useScope();
  const oid = ownerId!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [tests, results, members, programs] = await Promise.all([api.placementTests(oid), api.placementResults(oid), api.members(oid), api.programs(oid)]);
    return { tests, results, members, programs };
  }, [oid]);
  const [edit, setEdit] = useState<PlacementTest | null>(null);
  const [confirm, setConfirm] = useState<PlacementTest | null>(null);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const save = async () => { if (!edit || !edit.title.th.trim()) return; await api.savePlacementTest({ ...edit, title: { th: edit.title.th, en: edit.title.en || edit.title.th } }); setEdit(null); toast(t("app.saved")); reload(); };
  const remove = async () => { if (confirm) { await api.removePlacementTest(confirm.id); setConfirm(null); toast(t("app.saved")); reload(); } };
  const name = (uid: string | null) => (uid ? data.members.find((m) => m.uid === uid)?.displayName ?? uid : t("aplc.visitor"));
  const perLevel = (tst: PlacementTest) => CEFR_LEVELS.map((c) => ({ c, n: tst.questions.filter((q) => q.cefr === c).length })).filter((x) => x.n > 0);

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("aplc.title")} sub={t("aplc.sub")} actions={<Button icon="plus" onClick={() => setEdit(blank(oid))}>{t("aplc.add")}</Button>} />
      {data.tests.length === 0 ? <EmptyState icon="goal" title={t("app.none")} /> : (
        <Card pad="0">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t("les.title.th")}</th><th>{t("mock.questionsN", { n: "" })}</th><th>{t("aplc.level")}</th><th></th><th></th></tr></thead>
              <tbody>
                {data.tests.map((x) => (
                  <tr key={x.id}>
                    <td><b>{pick(x.title)}</b><div className="small muted">{pick(x.description)}</div></td>
                    <td>{x.questions.length}</td>
                    <td className="small">{perLevel(x).map((l) => `${l.c} ×${l.n}`).join(" · ") || "—"}</td>
                    <td><Badge tone={x.published ? "ok" : "neutral"}>{t(x.published ? "app.published" : "app.draft")}</Badge></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}><Button size="sm" variant="secondary" icon="pencil" onClick={() => setEdit(JSON.parse(JSON.stringify(x)))}>{t("app.edit")}</Button>{" "}<Button size="sm" variant="tertiary" icon="trash" onClick={() => setConfirm(x)} style={{ color: "var(--tone-stop-fg)" }}>{t("app.delete")}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card title={t("aplc.results")} style={{ marginTop: 16 }}>
        {data.results.length === 0 ? <div className="muted small">{t("app.none")}</div> : (
          <table className="table"><tbody>
            {data.results.slice(0, 30).map((r) => (
              <tr key={r.id}>
                <td className="small muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(r.submittedAt, lang, true)}</td>
                <td><b>{name(r.uid)}</b>{!r.uid && <div className="small muted">{r.visitorKey}</div>}</td>
                <td>{t("mock.raw", { raw: r.raw, total: r.total })}</td>
                <td><Badge tone="accent">{r.cefr}</Badge></td>
                <td className="small muted">{r.recommendedProgramIds.map((id) => pick(data.programs.find((p) => p.id === id)?.title)).filter(Boolean).join(", ")}</td>
              </tr>
            ))}
          </tbody></table>
        )}
      </Card>

      {edit && (
        <Modal wide title={edit.id ? t("app.edit") : t("aplc.add")} onClose={() => setEdit(null)} actions={<><Button variant="tertiary" onClick={() => setEdit(null)}>{t("app.cancel")}</Button><Button onClick={save} disabled={!edit.title.th.trim()}>{t("app.save")}</Button></>}>
          <div className="form-grid">
            <Field label={t("les.title.th")}><input className="input" value={edit.title.th} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, th: e.target.value } })} /></Field>
            <Field label={t("les.title.en")}><input className="input" value={edit.title.en} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, en: e.target.value } })} /></Field>
            <Field label={t("prg.desc.th")} span2><input className="input" value={edit.description.th} onChange={(e) => setEdit({ ...edit, description: { th: e.target.value, en: edit.description.en || e.target.value } })} /></Field>
            <div className="row"><Switch checked={edit.published} onChange={(v) => setEdit({ ...edit, published: v })} /> {t("app.published")}</div>
          </div>
          <h3 style={{ margin: "20px 0 4px", fontSize: "var(--text-lg)" }}>{t("mock.questionsN", { n: edit.questions.length })}</h3>
          <p className="muted small" style={{ margin: "0 0 10px" }}>{t("aplc.levelsHint")}</p>
          <div className="stack" style={{ gap: 10 }}>
            {edit.questions.map((q, qi) => {
              const setQ = (patch: Partial<typeof q>) => setEdit({ ...edit, questions: edit.questions.map((x, j) => (j === qi ? { ...x, ...patch } : x)) });
              return (
                <div key={q.id} className="quiz-q">
                  <div className="form-grid">
                    <Field label={`${qi + 1}. ${t("les.prompt.th")}`}><input className="input" value={q.prompt.th} onChange={(e) => setQ({ prompt: { ...q.prompt, th: e.target.value } })} /></Field>
                    <Field label={t("les.prompt.en")}><input className="input" value={q.prompt.en} onChange={(e) => setQ({ prompt: { ...q.prompt, en: e.target.value } })} /></Field>
                    <Field label={t("aplc.skill")}><select className="input" value={q.skill} onChange={(e) => setQ({ skill: e.target.value as Skill })}>{SKILLS.map((s) => <option key={s} value={s}>{t(`skill.${s}`)}</option>)}</select></Field>
                    <Field label={t("aplc.level")}><select className="input" value={q.cefr} onChange={(e) => setQ({ cefr: e.target.value as Cefr })}>{CEFR_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
                    <Field label={t("les.choices")}><input className="input" value={q.choices.join(" | ")} onChange={(e) => setQ({ choices: e.target.value.split("|").map((x) => x.trim()) })} /></Field>
                    <div className="row" style={{ alignItems: "flex-end", gap: 8 }}>
                      <Field label={t("les.answer")}><input className="input" type="number" min={1} max={Math.max(1, q.choices.length)} value={q.answer + 1} onChange={(e) => setQ({ answer: Math.min(q.choices.length - 1, Math.max(0, parseInt(e.target.value || "1", 10) - 1)) })} /></Field>
                      <Button size="sm" variant="tertiary" icon="trash" onClick={() => setEdit({ ...edit, questions: edit.questions.filter((_, j) => j !== qi) })}>{t("app.delete")}</Button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div><Button size="sm" variant="secondary" icon="plus" onClick={() => setEdit({ ...edit, questions: [...edit.questions, { id: newId("p"), skill: "grammar", cefr: "A1", prompt: { th: "", en: "" }, choices: ["", "", ""], answer: 0 }] })}>{t("les.addQuestion")}</Button></div>
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
