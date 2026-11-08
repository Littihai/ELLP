import { useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Avatar, Badge, Button, Card, ErrorBox, Field, Icon, Loading, Modal, PageHeader, Switch } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { AGE_BANDS, ageBandOf, ageOf, levelFor } from "@/lib/gamification";
import { nowIso } from "@/lib/format";
import { fmtDate } from "@/lib/format";
import type { Role, UserProfile } from "@/types";

const COLORS = ["#f59f00", "#4c58c4", "#2fb344", "#0b78a8", "#b0566f", "#2f7f86", "#a8612a", "#6b5fb0"];
const blank = (ownerId: string): UserProfile => ({
  uid: "", displayName: "", email: "", role: "learner", ownerId, enrolledProgramIds: [], birthYear: null, allowAllAges: false, parentConsent: { acknowledged: false, at: null, note: "" },
  xp: 0, streakDays: 0, lastActiveDate: null, badgeIds: [], avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)], active: true, createdAt: "",
});

/** The people of one tenant. An owner may make admins; an admin manages learners. Nobody removes their own account. */
export function MembersPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, pick, lang } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const { ownerId } = useScope();
  const oid = ownerId!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [members, programs] = await Promise.all([api.members(oid), api.programs(oid)]);
    return { members: members.sort((a, b) => a.role.localeCompare(b.role) || b.xp - a.xp), programs };
  }, [oid]);
  const [filter, setFilter] = useState<Role | "all">("all");
  const [edit, setEdit] = useState<UserProfile | null>(null);
  const [confirm, setConfirm] = useState<UserProfile | null>(null);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const canMakeAdmin = user?.role === "superadmin" || user?.role === "owner";
  const roles: Role[] = canMakeAdmin ? ["learner", "admin", "owner"] : ["learner"];
  const rows = data.members.filter((m) => filter === "all" || m.role === filter);

  const save = async () => {
    if (!edit || !edit.displayName.trim() || !edit.email.trim()) return;
    await api.saveMember(edit);
    setEdit(null); toast(t("app.saved")); reload();
  };
  const remove = async () => { if (confirm) { await api.removeMember(confirm.uid); setConfirm(null); toast(t("app.saved")); reload(); } };
  const toggleProgram = (id: string) => { if (!edit) return; const has = edit.enrolledProgramIds.includes(id); setEdit({ ...edit, enrolledProgramIds: has ? edit.enrolledProgramIds.filter((x) => x !== id) : [...edit.enrolledProgramIds, id] }); };

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("mem.title")} sub={t("mem.sub")} actions={<Button icon="plus" onClick={() => setEdit(blank(oid))}>{t("mem.add")}</Button>} />
      <div className="row" style={{ marginBottom: 12, gap: 6 }}>
        <button type="button" className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("mem.filter.all")} ({data.members.length})</button>
        {(["learner", "admin", "owner"] as Role[]).map((r) => <button key={r} type="button" className="chip" aria-pressed={filter === r} onClick={() => setFilter(r)}>{t(`role.${r}`)} ({data.members.filter((m) => m.role === r).length})</button>)}
      </div>
      <Card pad="0">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th></th><th>{t("mem.name")}</th><th>{t("mem.role")}</th><th>{t("age.band")}</th><th>{t("mem.programs")}</th><th>{t("mem.xp")}</th><th>{t("app.streak")}</th><th>{t("mem.lastActive")}</th><th>{t("app.active")}</th><th></th></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.uid}>
                  <td><Avatar name={m.displayName} color={m.avatarColor} size={32} /></td>
                  <td><b>{m.displayName}</b><div className="small muted">{m.email}</div></td>
                  <td><Badge tone={m.role === "learner" ? "accent" : m.role === "owner" ? "warn" : "neutral"}>{t(`role.${m.role}`)}</Badge></td>
                  <td className="small">
                    {m.role !== "learner" ? "—" : (
                      <span className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
                        {ageBandOf(m) ? <>{ageBandOf(m)!.replace("-", "–")} <span className="muted">({t("age.years", { n: ageOf(m.birthYear) ?? 0 })})</span></> : <span className="muted">{t("age.unknown")}</span>}
                        {m.allowAllAges && <Icon name="unlock" size={12} />}
                        <Icon name={m.parentConsent.acknowledged ? "checkCircle" : "alert"} size={12} color={m.parentConsent.acknowledged ? "var(--tone-ok-solid)" : "var(--tone-warn-solid)"} />
                      </span>
                    )}
                  </td>
                  <td className="small">{m.role === "learner" ? m.enrolledProgramIds.map((id) => pick(data.programs.find((p) => p.id === id)?.title)).filter(Boolean).join(", ") || "—" : "—"}</td>
                  <td>{m.role === "learner" ? <>{m.xp} <span className="small muted">L{levelFor(m.xp)}</span></> : "—"}</td>
                  <td>{m.role === "learner" ? m.streakDays : "—"}</td>
                  <td className="small muted">{m.lastActiveDate ? fmtDate(m.lastActiveDate, lang) : "—"}</td>
                  <td><Badge tone={m.active ? "ok" : "stop"}>{t(m.active ? "app.active" : "app.inactive")}</Badge></td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <Button size="sm" variant="secondary" icon="pencil" onClick={() => setEdit({ ...m })}>{t("app.edit")}</Button>{" "}
                    <Button size="sm" variant="tertiary" icon="trash" disabled={m.uid === user?.uid} title={m.uid === user?.uid ? t("mem.removeSelf") : undefined} onClick={() => setConfirm(m)} style={{ color: "var(--tone-stop-fg)" }}>{t("app.delete")}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {edit && (
        <Modal title={edit.uid ? t("app.edit") : t("mem.add")} onClose={() => setEdit(null)} actions={<><Button variant="tertiary" onClick={() => setEdit(null)}>{t("app.cancel")}</Button><Button onClick={save} disabled={!edit.displayName.trim() || !edit.email.trim()}>{t("app.save")}</Button></>}>
          <div className="form-grid">
            <Field label={t("mem.name")}><input className="input" value={edit.displayName} onChange={(e) => setEdit({ ...edit, displayName: e.target.value })} /></Field>
            <Field label={t("mem.email")}><input className="input" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
            <Field label={t("mem.role")}>
              <select className="input" value={edit.role} disabled={edit.uid === user?.uid} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>{roles.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}</select>
            </Field>
            <Field label={t("prg.color")}>
              <div className="row" style={{ gap: 6 }}>{COLORS.map((c) => <button key={c} type="button" aria-label={c} aria-pressed={edit.avatarColor === c} onClick={() => setEdit({ ...edit, avatarColor: c })} style={{ width: 26, height: 26, borderRadius: "50%", background: c, border: edit.avatarColor === c ? "3px solid var(--color-text)" : "3px solid transparent" }} />)}</div>
            </Field>
            {edit.role === "learner" && (
              <>
                <Field label={t("mem.programs")} span2>
                  <div className="row">{data.programs.map((p) => <button key={p.id} type="button" className="chip" aria-pressed={edit.enrolledProgramIds.includes(p.id)} onClick={() => toggleProgram(p.id)}>{pick(p.title)}</button>)}</div>
                </Field>
                <Field label={t("age.birthYear")} hint={t("age.birthYearHint")}>
                  <input className="input" type="number" min={1990} max={new Date().getFullYear()} placeholder={String(new Date().getFullYear() - 6)} value={edit.birthYear ?? ""}
                    onChange={(e) => setEdit({ ...edit, birthYear: e.target.value ? parseInt(e.target.value, 10) : null })} />
                </Field>
                <Field label={t("age.band")}>
                  <div className="input" style={{ display: "flex", alignItems: "center", background: "var(--color-neutral-50)" }}>
                    {ageBandOf(edit) ? `${t(`age.band.${ageBandOf(edit)!}`)} · ${t("age.years", { n: ageOf(edit.birthYear) ?? 0 })}` : t("age.unknown")}
                  </div>
                </Field>
                <div className="span-2">
                  <div className="row"><Switch checked={edit.allowAllAges} onChange={(v) => setEdit({ ...edit, allowAllAges: v })} /> <b>{t("age.override")}</b></div>
                  <div className="small muted" style={{ marginTop: 4 }}>{t("age.overrideHint")} ({AGE_BANDS.map((b) => b.replace("-", "–")).join(" / ")})</div>
                </div>
                <div className="span-2" style={{ padding: "12px 14px", borderRadius: "var(--radius-lg)", background: "var(--color-neutral-50)", border: "1px solid var(--color-neutral-200)" }}>
                  <label className="row" style={{ cursor: "pointer" }}>
                    <input type="checkbox" checked={edit.parentConsent.acknowledged}
                      onChange={(e) => setEdit({ ...edit, parentConsent: { ...edit.parentConsent, acknowledged: e.target.checked, at: e.target.checked ? (edit.parentConsent.at ?? nowIso()) : null } })} />
                    <b>{t("age.consent")}</b>
                    {edit.parentConsent.at && <span className="small muted">· {t("age.consentAt")} {fmtDate(edit.parentConsent.at, lang)}</span>}
                  </label>
                  <div className="small muted" style={{ margin: "4px 0 8px" }}>{t("age.consentHint")}</div>
                  <input className="input" placeholder={t("age.consentNote")} value={edit.parentConsent.note} onChange={(e) => setEdit({ ...edit, parentConsent: { ...edit.parentConsent, note: e.target.value } })} />
                </div>
              </>
            )}
            <div className="row span-2"><Switch checked={edit.active} disabled={edit.uid === user?.uid} onChange={(v) => setEdit({ ...edit, active: v })} /> {t("app.active")}</div>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title={t("app.delete")} onClose={() => setConfirm(null)} actions={<><Button variant="tertiary" onClick={() => setConfirm(null)}>{t("app.cancel")}</Button><Button variant="danger" icon="trash" onClick={remove}>{t("app.delete")}</Button></>}>
          <p><b>{confirm.displayName}</b> · {confirm.email}</p><p className="muted">{t("app.confirmDelete")}</p>
        </Modal>
      )}
    </>
  );
}
