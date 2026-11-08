import { useState } from "react";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, ErrorBox, Field, Loading, Modal, PageHeader, Switch } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { fmtDate } from "@/lib/format";
import type { Owner } from "@/types";

const blank = (): Owner => ({ id: "", code: "", name: { th: "", en: "" }, contactEmail: "", plan: "free", active: true, createdAt: "" });

/** Super Admin: the tenants. Adding one gives it an empty space for programs and members; removing one takes everything with it. */
export function OwnersPage() {
  const { t, pick, lang } = useI18n();
  const { toast } = useToast();
  const { reloadOwners, setOwnerId } = useScope();
  const { data, error, loading, reload } = useAsync(async () => {
    const [owners, programs, users] = await Promise.all([api.owners(), api.programs(), Promise.all((await api.owners()).map((o) => api.members(o.id)))]);
    return { owners, programs, counts: Object.fromEntries(owners.map((o, i) => [o.id, users[i].length])) };
  }, []);
  const [edit, setEdit] = useState<Owner | null>(null);
  const [confirm, setConfirm] = useState<Owner | null>(null);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;

  const save = async () => {
    if (!edit || !edit.name.th.trim() || !edit.code.trim()) return;
    await api.saveOwner({ ...edit, code: edit.code.toUpperCase() });
    setEdit(null); toast(t("app.saved")); reload(); reloadOwners();
  };
  const remove = async () => {
    if (!confirm) return;
    await api.removeOwner(confirm.id);
    setConfirm(null); toast(t("app.saved")); reload(); reloadOwners(); setOwnerId(null);
  };

  return (
    <>
      <PageHeader pretitle={t("role.superadmin")} title={t("own.title")} sub={t("own.sub")} actions={<Button icon="plus" onClick={() => setEdit(blank())}>{t("own.add")}</Button>} />
      <Card pad="0">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t("own.code")}</th><th>{t("own.name.th")}</th><th>{t("own.contact")}</th><th>{t("own.plan")}</th><th></th><th></th><th>{t("app.active")}</th><th></th></tr></thead>
            <tbody>
              {data.owners.map((o) => (
                <tr key={o.id}>
                  <td><code>{o.code}</code></td>
                  <td><b>{pick(o.name)}</b><div className="small muted">{lang === "th" ? o.name.en : o.name.th} · {fmtDate(o.createdAt, lang)}</div></td>
                  <td>{o.contactEmail}</td>
                  <td><Badge tone={o.plan === "enterprise" ? "accent" : o.plan === "school" ? "ok" : "neutral"}>{t(`own.plan.${o.plan}`)}</Badge></td>
                  <td className="small muted">{t("own.programsN", { n: data.programs.filter((p) => p.ownerId === o.id).length })}</td>
                  <td className="small muted">{t("own.membersN", { n: data.counts[o.id] ?? 0 })}</td>
                  <td><Badge tone={o.active ? "ok" : "stop"}>{t(o.active ? "app.active" : "app.inactive")}</Badge></td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <Button size="sm" variant="secondary" icon="pencil" onClick={() => setEdit({ ...o })}>{t("app.edit")}</Button>{" "}
                    <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirm(o)}>{t("app.delete")}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {edit && (
        <Modal title={edit.id ? t("app.edit") : t("own.add")} onClose={() => setEdit(null)} actions={<><Button variant="tertiary" onClick={() => setEdit(null)}>{t("app.cancel")}</Button><Button onClick={save} disabled={!edit.name.th.trim() || !edit.code.trim()}>{t("app.save")}</Button></>}>
          <div className="form-grid">
            <Field label={t("own.code")}><input className="input" value={edit.code} maxLength={6} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></Field>
            <Field label={t("own.plan")}>
              <select className="input" value={edit.plan} onChange={(e) => setEdit({ ...edit, plan: e.target.value as Owner["plan"] })}>
                {(["free", "school", "enterprise"] as const).map((p) => <option key={p} value={p}>{t(`own.plan.${p}`)}</option>)}
              </select>
            </Field>
            <Field label={t("own.name.th")}><input className="input" value={edit.name.th} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, th: e.target.value } })} /></Field>
            <Field label={t("own.name.en")}><input className="input" value={edit.name.en} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, en: e.target.value } })} /></Field>
            <Field label={t("own.contact")} span2><input className="input" type="email" value={edit.contactEmail} onChange={(e) => setEdit({ ...edit, contactEmail: e.target.value })} /></Field>
            <div className="row span-2"><Switch checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} /> {t("app.active")}</div>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title={t("app.delete")} onClose={() => setConfirm(null)} actions={<><Button variant="tertiary" onClick={() => setConfirm(null)}>{t("app.cancel")}</Button><Button variant="danger" icon="trash" onClick={remove}>{t("app.delete")}</Button></>}>
          <p><b>{pick(confirm.name)}</b></p>
          <p className="muted">{t("own.removeWarn")}</p>
          <p>{t("app.confirmDelete")}</p>
        </Modal>
      )}
    </>
  );
}
