import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Icon, Loading, Modal, PageHeader, Switch } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { fmtDuration, newId } from "@/lib/format";
import { ytThumb } from "@/modules/learn/shared";
import { SKILLS, type AgeBand, type Lesson, type Program, type Quest, type QuizQuestion, type UnlockRule } from "@/types";
import { AGE_BANDS } from "@/lib/gamification";

const blank = (programId: string, order: number): Lesson => ({
  id: "", programId, order, title: { th: "", en: "" }, summary: { th: "", en: "" }, youtubeId: "", videoUrl: "", checkpoints: [], durationSec: 120, xpReward: 50, vocabulary: [], skills: [], quiz: [], unlock: [], published: false,
});

/** Lessons of one program: the video, its XP, the words, the quiz and the unlock conditions, all in one form. */
export function LessonsAdminPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, pick } = useI18n();
  const { toast } = useToast();
  const { ownerId } = useScope();
  const oid = ownerId!;
  const [params, setParams] = useSearchParams();
  const { data, error, loading, reload } = useAsync(async () => {
    const [programs, lessons, quests] = await Promise.all([api.programs(oid), api.lessons(), api.quests(oid)]);
    return { programs, lessons: lessons.filter((l) => programs.some((p) => p.id === l.programId)), quests };
  }, [oid]);
  const programId = params.get("program") ?? data?.programs[0]?.id ?? "";
  const [edit, setEdit] = useState<Lesson | null>(null);
  const [confirm, setConfirm] = useState<Lesson | null>(null);
  // ?edit=<id> (from the dashboard) opens that lesson once the data is in
  useEffect(() => { const id = params.get("edit"); if (id && data) { const l = data.lessons.find((x) => x.id === id); if (l) { setEdit({ ...l }); params.delete("edit"); setParams(params, { replace: true }); } } }, [data, params, setParams]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const lessons = data.lessons.filter((l) => l.programId === programId).sort((a, b) => a.order - b.order);
  const program = data.programs.find((p) => p.id === programId);

  const save = async () => {
    if (!edit || !edit.title.th.trim() || (!edit.youtubeId.trim() && !edit.videoUrl.trim())) return;
    await api.saveLesson({ ...edit, youtubeId: edit.youtubeId.trim(), title: { th: edit.title.th, en: edit.title.en || edit.title.th } });
    setEdit(null); toast(t("app.saved")); reload();
  };
  const remove = async () => { if (confirm) { await api.removeLesson(confirm.id); setConfirm(null); toast(t("app.saved")); reload(); } };

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("adm.lessons")} sub={program ? pick(program.description) : undefined}
        actions={<Button icon="plus" disabled={!programId} onClick={() => setEdit(blank(programId, lessons.length + 1))}>{t("les.add")}</Button>} />
      {data.programs.length === 0 ? <EmptyState icon="book" title={t("app.none")} action={<Link to="/admin/programs" className="btn btn-primary btn-sm">{t("prg.add")}</Link>} /> : (
        <>
          <div className="tabs" style={{ marginBottom: 16 }}>
            {data.programs.map((p) => <button key={p.id} type="button" role="tab" className="tab" aria-selected={p.id === programId} onClick={() => setParams({ program: p.id })}><span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />{pick(p.title)}</button>)}
          </div>
          <Card pad="0">
            {lessons.length === 0 ? <EmptyState icon="video" title={t("app.none")} /> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t("les.order")}</th><th></th><th>{t("les.title.th")}</th><th>{t("les.youtube")}</th><th>{t("les.xp")}</th><th>{t("les.quiz")}</th><th>{t("les.unlock")}</th><th></th><th></th></tr></thead>
                  <tbody>
                    {lessons.map((l) => (
                      <tr key={l.id}>
                        <td>{l.order}</td>
                        <td>{l.youtubeId ? <img src={ytThumb(l.youtubeId)} alt="" style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 4, display: "block" }} /> : <span style={{ display: "grid", placeItems: "center", width: 64, height: 40, borderRadius: 4, background: "var(--color-neutral-200)" }}><Icon name="video" size={16} /></span>}</td>
                        <td><b>{pick(l.title)}</b><div className="small muted">{fmtDuration(l.durationSec)} · {l.vocabulary.length} {t("les.vocab").split(" ")[0]}{(l.skills ?? []).length > 0 && <> · {l.skills.map((sk) => t(`skill.${sk}`)).join(", ")}</>}</div></td>
                        <td><code className="small">{l.youtubeId || (l.videoUrl ? "mp4" : "—")}</code>{l.checkpoints.length > 0 && <div className="small muted">{l.checkpoints.length} cp</div>}</td>
                        <td>{l.xpReward}</td>
                        <td>{l.quiz.length}</td>
                        <td>{l.unlock.length === 0 ? <Badge tone="ok"><Icon name="unlock" size={11} />{t("rule.met")}</Badge> : <Badge tone="neutral"><Icon name="lock" size={11} />{l.unlock.length}</Badge>}</td>
                        <td><Badge tone={l.published ? "ok" : "neutral"}>{t(l.published ? "app.published" : "app.draft")}</Badge></td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <Link to={`/app/lessons/${l.id}`} className="btn btn-tertiary btn-sm" title={t("les.preview")}><Icon name="play" size={14} /></Link>
                          <Button size="sm" variant="secondary" icon="pencil" onClick={() => setEdit(JSON.parse(JSON.stringify(l)))}>{t("app.edit")}</Button>{" "}
                          <Button size="sm" variant="tertiary" icon="trash" onClick={() => setConfirm(l)} style={{ color: "var(--tone-stop-fg)" }}>{t("app.delete")}</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {edit && <LessonForm lesson={edit} setLesson={setEdit} programs={data.programs} lessons={data.lessons} quests={data.quests} onClose={() => setEdit(null)} onSave={save} />}
      {confirm && (
        <Modal title={t("app.delete")} onClose={() => setConfirm(null)} actions={<><Button variant="tertiary" onClick={() => setConfirm(null)}>{t("app.cancel")}</Button><Button variant="danger" icon="trash" onClick={remove}>{t("app.delete")}</Button></>}>
          <p><b>{pick(confirm.title)}</b></p><p className="muted">{t("app.confirmDelete")}</p>
        </Modal>
      )}
    </>
  );
}

function LessonForm({ lesson, setLesson, programs, lessons, quests, onClose, onSave }: {
  lesson: Lesson; setLesson: (l: Lesson) => void; programs: Program[]; lessons: Lesson[]; quests: Quest[]; onClose: () => void; onSave: () => void;
}) {
  const { t, pick } = useI18n();
  const l = lesson;
  const set = (patch: Partial<Lesson>) => setLesson({ ...l, ...patch });
  const others = lessons.filter((x) => x.id !== l.id);
  const ruleTypes: UnlockRule["type"][] = ["lesson_completed", "min_level", "min_xp", "quest_completed", "streak_days", "min_age", "age_band"];
  const newRule = (type: UnlockRule["type"]): UnlockRule => {
    switch (type) {
      case "lesson_completed": return { type, lessonId: others[0]?.id ?? "" };
      case "min_level": return { type, level: 2 };
      case "min_xp": return { type, xp: 100 };
      case "quest_completed": return { type, questId: quests[0]?.id ?? "" };
      case "streak_days": return { type, days: 2 };
      case "min_age": return { type, years: 5 };
      case "age_band": return { type, bands: ["6-8"] };
    }
  };
  const setRule = (i: number, r: UnlockRule) => set({ unlock: l.unlock.map((x, j) => (j === i ? r : x)) });
  const setQ = (i: number, q: QuizQuestion) => set({ quiz: l.quiz.map((x, j) => (j === i ? q : x)) });
  const num = (v: string, min: number) => Math.max(min, parseInt(v || "0", 10) || 0);

  return (
    <Modal wide title={l.id ? t("app.edit") : t("les.add")} onClose={onClose} actions={<><Button variant="tertiary" onClick={onClose}>{t("app.cancel")}</Button><Button onClick={onSave} disabled={!l.title.th.trim() || (!l.youtubeId.trim() && !l.videoUrl.trim())}>{t("app.save")}</Button></>}>
      <div className="form-grid">
        <Field label={t("les.program")}>
          <select className="input" value={l.programId} onChange={(e) => set({ programId: e.target.value })}>{programs.map((p) => <option key={p.id} value={p.id}>{pick(p.title)}</option>)}</select>
        </Field>
        <Field label={t("les.order")}><input className="input" type="number" min={1} value={l.order} onChange={(e) => set({ order: num(e.target.value, 1) })} /></Field>
        <Field label={t("les.title.th")}><input className="input" value={l.title.th} onChange={(e) => set({ title: { ...l.title, th: e.target.value } })} /></Field>
        <Field label={t("les.title.en")}><input className="input" value={l.title.en} onChange={(e) => set({ title: { ...l.title, en: e.target.value } })} /></Field>
        <Field label={t("les.summary.th")} span2><input className="input" value={l.summary.th} onChange={(e) => set({ summary: { ...l.summary, th: e.target.value } })} /></Field>
        <Field label={t("les.summary.en")} span2><input className="input" value={l.summary.en} onChange={(e) => set({ summary: { ...l.summary, en: e.target.value } })} /></Field>
        <Field label={t("les.youtube")} hint={t("les.youtubeHint")}>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input className="input" value={l.youtubeId} onChange={(e) => set({ youtubeId: e.target.value.replace(/^.*v=/, "").replace(/[&?].*$/, "") })} />
            {l.youtubeId && <img src={ytThumb(l.youtubeId)} alt="" style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 4 }} />}
          </div>
        </Field>
        <Field label={t("les.video")} hint={t("les.videoHint")} span2><input className="input" value={l.videoUrl} onChange={(e) => set({ videoUrl: e.target.value.trim() })} placeholder="https://…/lesson.mp4" /></Field>
        <Field label={t("les.duration")}><input className="input" type="number" min={10} value={l.durationSec} onChange={(e) => set({ durationSec: num(e.target.value, 10) })} /></Field>
        <Field label={t("les.xp")}><input className="input" type="number" min={0} value={l.xpReward} onChange={(e) => set({ xpReward: num(e.target.value, 0) })} /></Field>
        <Field label={t("les.vocab")}><input className="input" value={l.vocabulary.join(", ")} onChange={(e) => set({ vocabulary: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
        <Field label={t("les.skills")} span2>
          <div className="row" style={{ gap: 6 }}>{SKILLS.map((sk) => <button key={sk} type="button" className="chip" aria-pressed={(l.skills ?? []).includes(sk)} onClick={() => set({ skills: (l.skills ?? []).includes(sk) ? l.skills.filter((x) => x !== sk) : [...(l.skills ?? []), sk] })}>{t(`skill.${sk}`)}</button>)}</div>
        </Field>
        <div className="row span-2"><Switch checked={l.published} onChange={(v) => set({ published: v })} /> {t("app.published")}</div>
      </div>

      <h3 style={{ margin: "20px 0 4px", fontSize: "var(--text-lg)" }}>{t("les.unlock")}</h3>
      <p className="muted small" style={{ margin: "0 0 10px" }}>{t("les.unlockHint")}</p>
      <div className="stack" style={{ gap: 8 }}>
        {l.unlock.map((r, i) => (
          <div key={i} className="row" style={{ flexWrap: "nowrap" }}>
            <select className="input" style={{ maxWidth: 220 }} value={r.type} onChange={(e) => setRule(i, newRule(e.target.value as UnlockRule["type"]))}>
              {ruleTypes.map((rt) => <option key={rt} value={rt}>{t(`rule.${rt}`, { name: "…", n: "N", bands: "…" })}</option>)}
            </select>
            {r.type === "lesson_completed" && <select className="input" value={r.lessonId} onChange={(e) => setRule(i, { ...r, lessonId: e.target.value })}>{others.map((o) => <option key={o.id} value={o.id}>{o.order}. {pick(o.title)}</option>)}</select>}
            {r.type === "quest_completed" && <select className="input" value={r.questId} onChange={(e) => setRule(i, { ...r, questId: e.target.value })}>{quests.map((q) => <option key={q.id} value={q.id}>{pick(q.title)}</option>)}</select>}
            {r.type === "min_level" && <input className="input" type="number" min={1} max={10} value={r.level} onChange={(e) => setRule(i, { ...r, level: num(e.target.value, 1) })} />}
            {r.type === "min_xp" && <input className="input" type="number" min={0} value={r.xp} onChange={(e) => setRule(i, { ...r, xp: num(e.target.value, 0) })} />}
            {r.type === "streak_days" && <input className="input" type="number" min={1} value={r.days} onChange={(e) => setRule(i, { ...r, days: num(e.target.value, 1) })} />}
            {r.type === "min_age" && <input className="input" type="number" min={2} max={18} value={r.years} onChange={(e) => setRule(i, { ...r, years: num(e.target.value, 2) })} />}
            {r.type === "age_band" && (
              <div className="row" style={{ gap: 4 }}>
                {AGE_BANDS.map((b: AgeBand) => <button key={b} type="button" className="chip" aria-pressed={r.bands.includes(b)} onClick={() => setRule(i, { ...r, bands: r.bands.includes(b) ? r.bands.filter((x) => x !== b) : [...r.bands, b] })}>{b.replace("-", "–")}</button>)}
              </div>
            )}
            <button type="button" className="btn-icon" aria-label={t("app.delete")} onClick={() => set({ unlock: l.unlock.filter((_, j) => j !== i) })}><Icon name="trash" size={16} /></button>
          </div>
        ))}
        <div><Button size="sm" variant="secondary" icon="plus" onClick={() => set({ unlock: [...l.unlock, newRule("lesson_completed")] })}>{t("les.addRule")}</Button></div>
      </div>

      <h3 style={{ margin: "20px 0 10px", fontSize: "var(--text-lg)" }}>{t("les.checkpoints")}</h3>
      <div className="stack" style={{ gap: 12 }}>
        {l.checkpoints.map((c, i) => {
          const setC = (patch: Partial<typeof c>) => set({ checkpoints: l.checkpoints.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div key={c.id} className="quiz-q">
              <div className="form-grid">
                <Field label={t("les.cpAt")}><input className="input" type="number" min={1} value={c.atSec} onChange={(e) => setC({ atSec: num(e.target.value, 1) })} /></Field>
                <Field label={t("les.answer")}><input className="input" type="number" min={1} max={Math.max(1, c.choices.length)} value={c.answer + 1} onChange={(e) => setC({ answer: Math.min(c.choices.length - 1, num(e.target.value, 1) - 1) })} /></Field>
                <Field label={t("les.prompt.th")}><input className="input" value={c.prompt.th} onChange={(e) => setC({ prompt: { ...c.prompt, th: e.target.value } })} /></Field>
                <Field label={t("les.prompt.en")}><input className="input" value={c.prompt.en} onChange={(e) => setC({ prompt: { ...c.prompt, en: e.target.value } })} /></Field>
                <Field label={t("les.choices")} span2><input className="input" value={c.choices.join(" | ")} onChange={(e) => setC({ choices: e.target.value.split("|").map((s) => s.trim()) })} /></Field>
                <div className="span-2" style={{ display: "flex", justifyContent: "flex-end" }}><Button size="sm" variant="tertiary" icon="trash" onClick={() => set({ checkpoints: l.checkpoints.filter((_, j) => j !== i) })}>{t("app.delete")}</Button></div>
              </div>
            </div>
          );
        })}
        <div><Button size="sm" variant="secondary" icon="plus" onClick={() => set({ checkpoints: [...l.checkpoints, { id: newId("cp"), atSec: 10, prompt: { th: "", en: "" }, choices: ["", "", ""], answer: 0 }] })}>{t("les.addCheckpoint")}</Button></div>
      </div>

      <h3 style={{ margin: "20px 0 10px", fontSize: "var(--text-lg)" }}>{t("les.quiz")}</h3>
      <div className="stack" style={{ gap: 12 }}>
        {l.quiz.map((q, i) => (
          <div key={q.id} className="quiz-q">
            <div className="form-grid">
              <Field label={t("les.prompt.th")}><input className="input" value={q.prompt.th} onChange={(e) => setQ(i, { ...q, prompt: { ...q.prompt, th: e.target.value } })} /></Field>
              <Field label={t("les.prompt.en")}><input className="input" value={q.prompt.en} onChange={(e) => setQ(i, { ...q, prompt: { ...q.prompt, en: e.target.value } })} /></Field>
              <Field label={t("les.choices")} span2><input className="input" value={q.choices.join(" | ")} onChange={(e) => setQ(i, { ...q, choices: e.target.value.split("|").map((s) => s.trim()) })} /></Field>
              <Field label={t("les.answer")}><input className="input" type="number" min={1} max={Math.max(1, q.choices.length)} value={q.answer + 1} onChange={(e) => setQ(i, { ...q, answer: Math.min(q.choices.length - 1, num(e.target.value, 1) - 1) })} /></Field>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}><Button size="sm" variant="tertiary" icon="trash" onClick={() => set({ quiz: l.quiz.filter((_, j) => j !== i) })}>{t("app.delete")}</Button></div>
            </div>
          </div>
        ))}
        <div><Button size="sm" variant="secondary" icon="plus" onClick={() => set({ quiz: [...l.quiz, { id: newId("q"), prompt: { th: "", en: "" }, choices: ["", "", ""], answer: 0 }] })}>{t("les.addQuestion")}</Button></div>
      </div>
    </Modal>
  );
}
