import { useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, ErrorBox, Field, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import { fmtDate } from "@/lib/format";
import { PLANS, TRACKS, type Plan, type Track } from "@/types";

/** The learner's plan: what they have, what each plan opens, how to pay, and the request button (admin confirms). */
export function PlanPage() {
  const { user, refresh } = useAuth();
  const { t, pick, lang } = useI18n();
  const { toast } = useToast();
  const u = user!;
  const { data, error, loading, reload } = useAsync(() => (u.ownerId ? api.settings(u.ownerId) : Promise.resolve(null)), [u.ownerId]);
  const [plan, setPlan] = useState<Plan>(u.plan === "free" ? "pro" : u.plan);
  const [planTrack, setPlanTrack] = useState<Track>(u.planTrack ?? u.track ?? "foundation");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const request = async (p: Plan) => {
    setBusy(true);
    try { await api.requestPlan(p, p === "pro" ? planTrack : null, note); await refresh(); toast(p === "free" ? t("app.saved") : t("plan.requested")); } finally { setBusy(false); }
  };
  const tone = (p: Plan) => (p === "free" ? "ok" : p === "pro" ? "accent" : "warn");

  return (
    <>
      <PageHeader pretitle={t("nav.plan")} title={t("plan.title")} sub={t("plan.sub")} />
      <Card style={{ marginBottom: 16 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="eyebrow">{t("plan.current")}</div>
            <div className="row" style={{ marginTop: 4 }}>
              <Badge tone={tone(u.plan)}>{t(`plan.${u.plan}`)}</Badge>
              <Badge tone={u.planStatus === "active" ? "ok" : u.planStatus === "pending" ? "warn" : "stop"}>{t(`plan.status.${u.planStatus}`)}</Badge>
              {u.plan === "pro" && u.planTrack && <span className="small muted">{t("plan.covers", { what: t(`track.${u.planTrack}`) })}</span>}
              {u.plan === "premium" && <span className="small muted">{t("plan.covers", { what: t("plan.coversAll") })}</span>}
            </div>
            {u.planStatus === "pending" && <div className="small muted" style={{ marginTop: 6 }}><Icon name="clock" size={12} /> {t("plan.pending.hint", { plan: t(`plan.${u.plan}`) })} · {fmtDate(u.planRequestedAt, lang, true)}</div>}
          </div>
          {u.planStatus === "pending" && <Button variant="tertiary" size="sm" busy={busy} onClick={() => request("free")}>{t("plan.cancelRequest")}</Button>}
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 16 }}>
        {PLANS.map((p) => (
          <Card key={p} style={{ outline: plan === p ? "2px solid var(--color-accent)" : undefined }}>
            <div className="row" style={{ justifyContent: "space-between" }}><h3 style={{ margin: 0 }}>{t(`plan.${p}`)}</h3><Badge tone={tone(p)}>{p === u.plan && u.planStatus === "active" ? t("plan.current") : ""}{p === u.plan && u.planStatus === "active" ? "" : p === "free" ? "0 ฿" : ""}</Badge></div>
            <p className="muted small" style={{ minHeight: 54 }}>{t(`plan.${p}.desc`)}</p>
            {p !== "free" && <Button variant={plan === p ? "primary" : "secondary"} size="sm" onClick={() => setPlan(p)} disabled={u.plan === p && u.planStatus === "active"}>{t("plan.choose")}</Button>}
          </Card>
        ))}
      </div>
      {plan !== "free" && (
        <Card title={`${t("plan.choose")}: ${t(`plan.${plan}`)}`}>
          <div className="form-grid">
            {plan === "pro" && (
              <Field label={t("plan.chooseTrack")}>
                <select className="input" value={planTrack} onChange={(e) => setPlanTrack(e.target.value as Track)}>{TRACKS.map((tr) => <option key={tr} value={tr}>{t(`track.${tr}`)}</option>)}</select>
              </Field>
            )}
            <Field label={t("plan.note")} span2={plan !== "pro"}><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            {data && pick(data.paymentInstructions) && (
              <div className="span-2" style={{ padding: "12px 14px", borderRadius: "var(--radius-lg)", background: "var(--tone-warn-bg)", color: "var(--tone-warn-fg)", fontSize: "var(--text-sm)" }}>
                <b>{t("plan.howToPay")}</b><div>{pick(data.paymentInstructions)}</div>
              </div>
            )}
            <div className="span-2" style={{ display: "flex", justifyContent: "flex-end" }}><Button icon="paperAirplane" busy={busy} onClick={() => request(plan)} disabled={u.plan === plan && u.planStatus !== "expired"}>{t("plan.choose")}</Button></div>
          </div>
        </Card>
      )}
    </>
  );
}
