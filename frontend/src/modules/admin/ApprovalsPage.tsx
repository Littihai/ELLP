import { useState } from "react";
import { useI18n } from "@/app/providers/I18nProvider";
import { Avatar, Badge, Button, Card, EmptyState, ErrorBox, Field, Loading, Modal, PageHeader } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { fmtDate } from "@/lib/format";
import { PLANS, TRACKS, type Plan, type PlanStatus, type Track, type UserProfile } from "@/types";

/** Plan requests: the admin checks the transfer (slip in chat or reference in the note) and approves, declines or sets a plan by hand. */
export function ApprovalsPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { ownerId } = useScope();
  const { data, error, loading, reload } = useAsync(async () => (await api.members(ownerId!)).filter((m) => m.role === "learner"), [ownerId]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [edit, setEdit] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<{ plan: Plan; status: PlanStatus; planTrack: Track | null; note: string }>({ plan: "free", status: "active", planTrack: null, note: "" });
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const rows = data.filter((m) => filter === "all" || m.planStatus === "pending").sort((a, b) => (b.planRequestedAt ?? "").localeCompare(a.planRequestedAt ?? ""));
  const pending = data.filter((m) => m.planStatus === "pending").length;

  const act = async (m: UserProfile, plan: Plan, status: PlanStatus, planTrack: Track | null, note: string) => {
    await api.setMemberPlan(m.uid, plan, status, planTrack, note);
    toast(status === "active" && plan !== "free" ? t("apv.approved") : t("app.saved")); reload(); setEdit(null);
  };
  const tone = (p: Plan) => (p === "free" ? "ok" : p === "pro" ? "accent" : "warn");

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("apv.title")} sub={t("apv.sub")} />
      <div className="row" style={{ marginBottom: 12, gap: 6 }}>
        <button type="button" className="chip" aria-pressed={filter === "pending"} onClick={() => setFilter("pending")}>{t("apv.pending")} ({pending})</button>
        <button type="button" className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("apv.all")} ({data.length})</button>
      </div>
      <Card pad="0">
        {rows.length === 0 ? <EmptyState icon="checkCircle" title={t("app.none")} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th></th><th>{t("mem.name")}</th><th>{t("track")}</th><th>{t("plan")}</th><th>{t("plan.note")}</th><th>{t("apv.requested")}</th><th></th></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.uid}>
                    <td><Avatar name={m.displayName} color={m.avatarColor} size={32} /></td>
                    <td><b>{m.displayName}</b><div className="small muted">{m.email}</div></td>
                    <td className="small">{m.track ? t(`track.${m.track}`) : "—"}</td>
                    <td><div className="row" style={{ gap: 4 }}><Badge tone={tone(m.plan)}>{t(`plan.${m.plan}`)}{m.plan === "pro" && m.planTrack && <> · {t(`track.${m.planTrack}`)}</>}</Badge><Badge tone={m.planStatus === "active" ? "ok" : m.planStatus === "pending" ? "warn" : "stop"}>{t(`plan.status.${m.planStatus}`)}</Badge></div></td>
                    <td className="small" style={{ maxWidth: 260 }}>{m.planNote || "—"}</td>
                    <td className="small muted" style={{ whiteSpace: "nowrap" }}>{m.planRequestedAt ? fmtDate(m.planRequestedAt, lang, true) : "—"}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {m.planStatus === "pending" && <><Button size="sm" variant="success" icon="check" onClick={() => act(m, m.plan, "active", m.planTrack, m.planNote)}>{t("apv.approve")}</Button>{" "}<Button size="sm" variant="tertiary" onClick={() => act(m, "free", "active", null, m.planNote)}>{t("apv.decline")}</Button>{" "}</>}
                      {m.planStatus === "active" && m.plan !== "free" && <><Button size="sm" variant="tertiary" onClick={() => act(m, m.plan, "expired", m.planTrack, m.planNote)}>{t("apv.expire")}</Button>{" "}</>}
                      <Button size="sm" variant="secondary" icon="pencil" onClick={() => { setEdit(m); setForm({ plan: m.plan, status: m.planStatus, planTrack: m.planTrack ?? m.track, note: m.planNote }); }}>{t("apv.set")}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {edit && (
        <Modal title={`${t("apv.set")}: ${edit.displayName}`} onClose={() => setEdit(null)} actions={<><Button variant="tertiary" onClick={() => setEdit(null)}>{t("app.cancel")}</Button><Button onClick={() => act(edit, form.plan, form.status, form.plan === "pro" ? form.planTrack : null, form.note)}>{t("app.save")}</Button></>}>
          <div className="form-grid">
            <Field label={t("plan")}><select className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as Plan })}>{PLANS.map((p) => <option key={p} value={p}>{t(`plan.${p}`)}</option>)}</select></Field>
            <Field label={t("mail.status")}><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PlanStatus })}>{(["active", "pending", "expired"] as PlanStatus[]).map((s) => <option key={s} value={s}>{t(`plan.status.${s}`)}</option>)}</select></Field>
            {form.plan === "pro" && <Field label={t("plan.chooseTrack")}><select className="input" value={form.planTrack ?? ""} onChange={(e) => setForm({ ...form, planTrack: e.target.value as Track })}>{TRACKS.map((tr) => <option key={tr} value={tr}>{t(`track.${tr}`)}</option>)}</select></Field>}
            <Field label={t("apv.noteAdmin")} span2><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}
