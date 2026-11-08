import { useState } from "react";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Icon, Loading, Modal, PageHeader, Switch } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { QUEST_ICON } from "@/modules/learn/shared";
import type { Quest, QuestGoalType, QuestScope } from "@/types";

const blank = (ownerId: string): Quest => ({ id: "", ownerId, programId: null, scope: "daily", title: { th: "", en: "" }, description: { th: "", en: "" }, goal: { type: "watch_videos", target: 1 }, xpReward: 20, badgeId: null, active: true });

/** The owner's quests: what counts, how much, how often, and what it pays. */
export function QuestsAdminPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, pick } = useI18n();
  const { toast } = useToast();
  const { ownerId } = useScope();
  const oid = ownerId!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [quests, programs, badges] = await Promise.all([api.quests(oid), api.programs(oid), api.badges()]);
    return { quests, programs, badges };
  }, [oid]);
  const [edit, setEdit] = useState<Quest | null>(null);
  const [confirm, setConfirm] = useState<Quest | null>(null);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const scopes: QuestScope[] = ["daily", "weekly", "program"];
  const goals: QuestGoalType[] = ["watch_videos", "pass_quizzes", "earn_xp", "streak_days"];

  const save = async () => {
    if (!edit || !edit.title.th.trim()) return;
    await api.saveQuest({ ...edit, title: { th: edit.title.th, en: edit.title.en || edit.title.th } });
    setEdit(null); toast(t("app.saved")); reload();
  };
  const remove = async () => { if (confirm) { await api.removeQuest(confirm.id); setConfirm(null); toast(t("app.saved")); reload(); } };
  const num = (v: string, min: number) => Math.max(min, parseInt(v || "0", 10) || 0);

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("adm.quests")} sub={t("quests.sub")} actions={<Button icon="plus" onClick={() => setEdit(blank(oid))}>{t("qst.add")}</Button>} />
      {data.quests.length === 0 ? <EmptyState icon="rocket" title={t("app.none")} /> : (
        <Card pad="0">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th></th><th>{t("les.title.th")}</th><th>{t("qst.scope")}</th><th>{t("qst.goal")}</th><th>{t("qst.programScope")}</th><th>{t("qst.xp")}</th><th>{t("qst.badge")}</th><th>{t("app.active")}</th><th></th></tr></thead>
              <tbody>
                {data.quests.map((q) => (
                  <tr key={q.id}>
                    <td><span style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 8, background: "var(--color-accent-100)", color: "var(--color-accent)" }}><Icon name={QUEST_ICON[q.goal.type]} size={16} /></span></td>
                    <td><b>{pick(q.title)}</b><div className="small muted">{pick(q.description)}</div></td>
                    <td><Badge tone="neutral">{t(`quests.${q.scope}`)}</Badge></td>
                    <td>{t(`quests.goal.${q.goal.type}`, { n: q.goal.target })}</td>
                    <td className="small">{q.programId ? pick(data.programs.find((p) => p.id === q.programId)?.title) : t("qst.allPrograms")}</td>
                    <td>+{q.xpReward}</td>
                    <td className="small">{q.badgeId ? pick(data.badges.find((b) => b.id === q.badgeId)?.name) : "—"}</td>
                    <td><Badge tone={q.active ? "ok" : "stop"}>{t(q.active ? "app.active" : "app.inactive")}</Badge></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <Button size="sm" variant="secondary" icon="pencil" onClick={() => setEdit({ ...q })}>{t("app.edit")}</Button>{" "}
                      <Button size="sm" variant="tertiary" icon="trash" onClick={() => setConfirm(q)} style={{ color: "var(--tone-stop-fg)" }}>{t("app.delete")}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {edit && (
        <Modal title={edit.id ? t("app.edit") : t("qst.add")} onClose={() => setEdit(null)} actions={<><Button variant="tertiary" onClick={() => setEdit(null)}>{t("app.cancel")}</Button><Button onClick={save} disabled={!edit.title.th.trim()}>{t("app.save")}</Button></>}>
          <div className="form-grid">
            <Field label={t("les.title.th")}><input className="input" value={edit.title.th} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, th: e.target.value } })} /></Field>
            <Field label={t("les.title.en")}><input className="input" value={edit.title.en} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, en: e.target.value } })} /></Field>
            <Field label={t("prg.desc.th")}><input className="input" value={edit.description.th} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, th: e.target.value } })} /></Field>
            <Field label={t("prg.desc.en")}><input className="input" value={edit.description.en} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, en: e.target.value } })} /></Field>
            <Field label={t("qst.scope")}><select className="input" value={edit.scope} onChange={(e) => setEdit({ ...edit, scope: e.target.value as QuestScope })}>{scopes.map((s) => <option key={s} value={s}>{t(`quests.${s}`)}</option>)}</select></Field>
            <Field label={t("qst.programScope")}>
              <select className="input" value={edit.programId ?? ""} onChange={(e) => setEdit({ ...edit, programId: e.target.value || null })}>
                <option value="">{t("qst.allPrograms")}</option>{data.programs.map((p) => <option key={p.id} value={p.id}>{pick(p.title)}</option>)}
              </select>
            </Field>
            <Field label={t("qst.goal")}><select className="input" value={edit.goal.type} onChange={(e) => setEdit({ ...edit, goal: { ...edit.goal, type: e.target.value as QuestGoalType } })}>{goals.map((g) => <option key={g} value={g}>{t(`quests.goal.${g}`, { n: "N" })}</option>)}</select></Field>
            <Field label={t("qst.target")}><input className="input" type="number" min={1} value={edit.goal.target} onChange={(e) => setEdit({ ...edit, goal: { ...edit.goal, target: num(e.target.value, 1) } })} /></Field>
            <Field label={t("qst.xp")}><input className="input" type="number" min={0} value={edit.xpReward} onChange={(e) => setEdit({ ...edit, xpReward: num(e.target.value, 0) })} /></Field>
            <Field label={t("qst.badge")}>
              <select className="input" value={edit.badgeId ?? ""} onChange={(e) => setEdit({ ...edit, badgeId: e.target.value || null })}>
                <option value="">{t("qst.noBadge")}</option>{data.badges.map((b) => <option key={b.id} value={b.id}>{pick(b.name)}</option>)}
              </select>
            </Field>
            <div className="row span-2"><Switch checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} /> {t("app.active")}</div>
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
