import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, ErrorBox, Field, Icon, Loading, Modal, PageHeader, Switch } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import type { Program } from "@/types";

const COLORS = ["#066fd1", "#f59f00", "#2fb344", "#4c58c4", "#b0566f", "#2f7f86", "#a8612a", "#6b5fb0"];
const blank = (ownerId: string): Program => ({ id: "", ownerId, title: { th: "", en: "" }, description: { th: "", en: "" }, level: "beginner", color: COLORS[0], published: false, createdAt: "" });

/** The owner's teaching media (programs). A program is a container; its videos live on the Lessons page. */
export function ProgramsAdminPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, pick } = useI18n();
  const { toast } = useToast();
  const { ownerId } = useScope();
  const oid = ownerId!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [programs, lessons] = await Promise.all([api.programs(oid), api.lessons()]);
    return { programs, lessons };
  }, [oid]);
  const [edit, setEdit] = useState<Program | null>(null);
  const [confirm, setConfirm] = useState<Program | null>(null);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;

  const save = async () => {
    if (!edit || !edit.title.th.trim()) return;
    await api.saveProgram({ ...edit, title: { th: edit.title.th, en: edit.title.en || edit.title.th } });
    setEdit(null); toast(t("app.saved")); reload();
  };
  const remove = async () => { if (confirm) { await api.removeProgram(confirm.id); setConfirm(null); toast(t("app.saved")); reload(); } };

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("adm.programs")} actions={<Button icon="plus" onClick={() => setEdit(blank(oid))}>{t("prg.add")}</Button>} />
      <div className="grid-cards">
        {data.programs.map((p) => {
          const n = data.lessons.filter((l) => l.programId === p.id).length;
          return (
            <Card key={p.id} pad="0" style={{ overflow: "hidden" }}>
              <div style={{ height: 8, background: p.color }} />
              <div style={{ padding: "14px 16px" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <Badge tone={p.published ? "ok" : "neutral"}>{t(p.published ? "app.published" : "app.draft")}</Badge>
                  <span className="small muted">{t("programs.lessonsN", { n })} · {t(`programs.level.${p.level}`)}</span>
                </div>
                <h3 style={{ margin: "8px 0 4px", fontSize: "var(--text-lg)" }}>{pick(p.title)}</h3>
                <p className="muted" style={{ margin: 0, fontSize: "var(--text-sm)", minHeight: 42 }}>{pick(p.description)}</p>
                <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
                  <Link to={`/admin/lessons?program=${p.id}`} className="btn btn-secondary btn-sm"><Icon name="video" size={14} /> {t("prg.manageLessons")}</Link>
                  <span className="row" style={{ gap: 6 }}>
                    <Button size="sm" variant="tertiary" icon="pencil" onClick={() => setEdit({ ...p })}>{t("app.edit")}</Button>
                    <Button size="sm" variant="tertiary" icon="trash" onClick={() => setConfirm(p)} style={{ color: "var(--tone-stop-fg)" }}>{t("app.delete")}</Button>
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {edit && (
        <Modal title={edit.id ? t("app.edit") : t("prg.add")} onClose={() => setEdit(null)} actions={<><Button variant="tertiary" onClick={() => setEdit(null)}>{t("app.cancel")}</Button><Button onClick={save} disabled={!edit.title.th.trim()}>{t("app.save")}</Button></>}>
          <div className="form-grid">
            <Field label={t("prg.title.th")}><input className="input" value={edit.title.th} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, th: e.target.value } })} /></Field>
            <Field label={t("prg.title.en")}><input className="input" value={edit.title.en} onChange={(e) => setEdit({ ...edit, title: { ...edit.title, en: e.target.value } })} /></Field>
            <Field label={t("prg.desc.th")} span2><textarea className="input" rows={2} value={edit.description.th} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, th: e.target.value } })} /></Field>
            <Field label={t("prg.desc.en")} span2><textarea className="input" rows={2} value={edit.description.en} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, en: e.target.value } })} /></Field>
            <Field label={t("prg.level")}>
              <select className="input" value={edit.level} onChange={(e) => setEdit({ ...edit, level: e.target.value as Program["level"] })}>
                {(["beginner", "elementary", "intermediate"] as const).map((l) => <option key={l} value={l}>{t(`programs.level.${l}`)}</option>)}
              </select>
            </Field>
            <Field label={t("prg.color")}>
              <div className="row" style={{ gap: 6 }}>
                {COLORS.map((c) => <button key={c} type="button" aria-label={c} aria-pressed={edit.color === c} onClick={() => setEdit({ ...edit, color: c })} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: edit.color === c ? "3px solid var(--color-text)" : "3px solid transparent" }} />)}
              </div>
            </Field>
            <div className="row span-2"><Switch checked={edit.published} onChange={(v) => setEdit({ ...edit, published: v })} /> {t("app.published")}</div>
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
