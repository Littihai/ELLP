import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, ErrorBox, Field, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { api, USE_DEMO } from "@/services";
import { fmtDate, fmtNum } from "@/lib/format";
import { daysLeft, expiryStatus, priceFor } from "@/lib/commerce";
import { PLANS, TRACKS, type Payment, type PaymentMethod, type Plan, type Track } from "@/types";

/**
 * The learner's plan (1.3): what they have and until when, the three plans with prices, and the checkout: PromptPay or card
 * through the tenant's gateway (the demo gateway shows a QR and a "simulate" button; live mode waits for the provider's
 * webhook), or a bank transfer the admin confirms. Receipts and the payment history sit below.
 */
export function PlanPage() {
  const { user, refresh } = useAuth();
  const { t, pick, lang } = useI18n();
  const { toast } = useToast();
  const u = user!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [settings, payments] = await Promise.all([u.ownerId ? api.settings(u.ownerId) : Promise.resolve(null), api.myPayments()]);
    return { settings, payments };
  }, [u.ownerId, u.plan, u.planStatus]);
  const [plan, setPlan] = useState<Plan>(u.plan === "free" ? "pro" : u.plan);
  const [planTrack, setPlanTrack] = useState<Track>(u.planTrack ?? u.track ?? "foundation");
  const [method, setMethod] = useState<PaymentMethod>("promptpay");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<Payment | null>(null);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const pricing = data.settings?.pricing ?? { pro: 0, premium: 0, currency: "THB" as const, months: 1 };
  const provider = data.settings?.paymentProvider ?? "demo";
  const gatewayOn = provider !== "manual";
  const exp = expiryStatus(u.planExpiresAt);
  const tone = (p: Plan) => (p === "free" ? "ok" : p === "pro" ? "accent" : "warn");
  const payTone = (s: Payment["status"]) => (s === "paid" ? "ok" : s === "pending" ? "warn" : s === "refunded" ? "neutral" : "stop");

  const start = async () => {
    setBusy(true);
    try {
      const pay = await api.createCheckout(plan, plan === "pro" ? planTrack : null, method, note);
      setCheckout(pay);
      if (method === "transfer") { await refresh(); toast(t("plan.requested")); }
      reload();
    } catch (e) {
      toast(e instanceof Error && e.message === "GATEWAY_OFF" ? t("pay.gatewayOff") : t("app.error"), "stop");
    } finally { setBusy(false); }
  };
  const simulate = async () => {
    if (!checkout) return;
    setBusy(true);
    try { const pay = await api.confirmDemoPayment(checkout.id); setCheckout(pay); await refresh(); toast(t("pay.success", { plan: t(`plan.${pay.plan}`) })); reload(); } finally { setBusy(false); }
  };

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
              {u.planExpiresAt && u.plan !== "free" && <span className="small muted"><Icon name="clock" size={12} /> {t("pay.expires")} {fmtDate(u.planExpiresAt, lang)}</span>}
            </div>
            {u.planStatus === "pending" && <div className="small muted" style={{ marginTop: 6 }}><Icon name="clock" size={12} /> {t("plan.pending.hint", { plan: t(`plan.${u.plan}`) })} · {fmtDate(u.planRequestedAt, lang, true)}</div>}
            {exp === "expiring" && u.planStatus === "active" && <div className="small" style={{ marginTop: 6, color: "var(--tone-warn-fg)" }}><Icon name="alert" size={12} /> {t("pay.expiring", { n: daysLeft(u.planExpiresAt) })}</div>}
            {u.planStatus === "expired" && <div className="small" style={{ marginTop: 6, color: "var(--tone-stop-fg)" }}><Icon name="alert" size={12} /> {t("pay.expiredPlan")}</div>}
          </div>
          {u.planStatus === "pending" && <Button variant="tertiary" size="sm" busy={busy} onClick={() => api.requestPlan("free", null, "").then(() => refresh()).then(reload)}>{t("plan.cancelRequest")}</Button>}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 16 }}>
        {PLANS.map((p) => (
          <Card key={p} style={{ outline: plan === p && p !== "free" ? "2px solid var(--color-accent)" : undefined }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{t(`plan.${p}`)}</h3>
              <b style={{ color: "var(--color-accent-700)" }}>{p === "free" ? "0 ฿" : `${fmtNum(priceFor(pricing, p))} ฿`}<span className="small muted" style={{ fontWeight: 500 }}> {p !== "free" && t("pay.perMonths", { n: pricing.months })}</span></b>
            </div>
            <p className="muted small" style={{ minHeight: 54 }}>{t(`plan.${p}.desc`)}</p>
            {p !== "free" && <Button variant={plan === p ? "primary" : "secondary"} size="sm" onClick={() => { setPlan(p); setCheckout(null); }}>{u.plan === p && u.planStatus === "active" ? t("pay.renew") : t("plan.choose")}</Button>}
          </Card>
        ))}
      </div>

      {plan !== "free" && (
        <Card title={`${t("pay.title")}: ${t(`plan.${plan}`)} · ${fmtNum(priceFor(pricing, plan))} ฿`} style={{ marginBottom: 16 }}>
          {!checkout ? (
            <div className="form-grid">
              {plan === "pro" && (
                <Field label={t("plan.chooseTrack")}>
                  <select className="input" value={planTrack} onChange={(e) => setPlanTrack(e.target.value as Track)}>{TRACKS.map((tr) => <option key={tr} value={tr}>{t(`track.${tr}`)}</option>)}</select>
                </Field>
              )}
              <Field label={t("pay.method")} span2={plan !== "pro"}>
                <div className="row" style={{ gap: 6 }}>
                  {(["promptpay", "card", "transfer"] as PaymentMethod[]).map((m) => (
                    <button key={m} type="button" className="chip" aria-pressed={method === m} disabled={!gatewayOn && m !== "transfer"} onClick={() => setMethod(m)}>{t(`pay.method.${m}`)}</button>
                  ))}
                </div>
              </Field>
              {method === "transfer" && (
                <>
                  <Field label={t("plan.note")} span2><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                  {data.settings && pick(data.settings.paymentInstructions) && (
                    <div className="span-2" style={{ padding: "12px 14px", borderRadius: "var(--radius-lg)", background: "var(--tone-warn-bg)", color: "var(--tone-warn-fg)", fontSize: "var(--text-sm)" }}><b>{t("plan.howToPay")}</b><div>{pick(data.settings.paymentInstructions)}</div></div>
                  )}
                </>
              )}
              <div className="span-2" style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button icon="arrowRight" busy={busy} onClick={start}>{method === "transfer" ? t("plan.choose") : t("pay.choosePay", { amount: fmtNum(priceFor(pricing, plan)) })}</Button>
              </div>
            </div>
          ) : (
            <div className="stack">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span><b>{t(`pay.method.${checkout.method}`)}</b> · {fmtNum(checkout.amount)} ฿ · <span className="small muted">{t("pay.ref")}: {checkout.reference}</span></span>
                <Badge tone={payTone(checkout.status)}>{t(`pay.${checkout.status}`)}</Badge>
              </div>
              {checkout.status === "pending" && checkout.method === "promptpay" && checkout.qrPayload && (
                <div className="row" style={{ gap: 20, alignItems: "flex-start" }}>
                  <FakeQr payload={checkout.qrPayload} />
                  <div className="stack" style={{ gap: 8, flex: 1, minWidth: 220 }}>
                    <div>{t("pay.scan")}</div>
                    <code className="small muted" style={{ wordBreak: "break-all" }}>{checkout.qrPayload}</code>
                    {USE_DEMO && checkout.provider === "demo" && (<><Button variant="success" icon="checkCircle" busy={busy} onClick={simulate}>{t("pay.demoConfirm")}</Button><div className="small muted">{t("pay.demoHint")}</div></>)}
                  </div>
                </div>
              )}
              {checkout.status === "pending" && checkout.method === "card" && (
                <div className="stack" style={{ gap: 8 }}>
                  <div className="muted">{t("pay.cardDemo")}</div>
                  {USE_DEMO && checkout.provider === "demo" && (<div><Button variant="success" icon="checkCircle" busy={busy} onClick={simulate}>{t("pay.demoConfirm")}</Button><div className="small muted">{t("pay.demoHint")}</div></div>)}
                </div>
              )}
              {checkout.status === "pending" && checkout.method === "transfer" && <div className="muted">{t("plan.pending.hint", { plan: t(`plan.${checkout.plan}`) })}</div>}
              {checkout.status === "paid" && <div className="row"><Icon name="checkCircleFill" size={18} color="var(--tone-ok-solid)" /><b>{t("pay.success", { plan: t(`plan.${checkout.plan}`) })}</b>{checkout.receiptNo && <Link to={`/app/receipts/${checkout.id}`} className="btn btn-secondary btn-sm">{t("pay.receipt")} {checkout.receiptNo}</Link>}</div>}
              <div><Button variant="tertiary" size="sm" onClick={() => setCheckout(null)}>{t("app.back")}</Button></div>
            </div>
          )}
        </Card>
      )}

      <Card title={t("pay.history")}>
        {data.payments.length === 0 ? <div className="muted">{t("app.none")}</div> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t("mail.when")}</th><th>{t("plan")}</th><th>{t("pay.method")}</th><th>{t("pay.amount")}</th><th>{t("mail.status")}</th><th>{t("pay.receipt")}</th></tr></thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="small muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(p.createdAt, lang, true)}</td>
                    <td><Badge tone={tone(p.plan)}>{t(`plan.${p.plan}`)}{p.planTrack && ` · ${t(`track.${p.planTrack}`)}`}</Badge></td>
                    <td className="small">{t(`pay.method.${p.method}`)}</td>
                    <td>{fmtNum(p.amount)} ฿</td>
                    <td><Badge tone={payTone(p.status)}>{t(`pay.${p.status}`)}</Badge></td>
                    <td>{p.receiptNo ? <Link to={`/app/receipts/${p.id}`}>{p.receiptNo}</Link> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/** A deterministic block pattern from the payload: it looks like a QR for the demo and says so in its title. No real code is encoded. */
export function FakeQr({ payload, size = 168 }: { payload: string; size?: number }) {
  const n = 21;
  let h = 2166136261;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) { h ^= payload.charCodeAt(i % payload.length); h = Math.imul(h, 16777619) >>> 0; cells.push(((h >>> (i % 13)) & 1) === 1); }
  const finder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const s = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="demo QR" style={{ background: "#fff", borderRadius: 8, padding: 4, boxSizing: "border-box" }}>
      <title>demo QR (not scannable)</title>
      {cells.map((on, i) => { const r = Math.floor(i / n), c = i % n; const f = finder(r, c); const dark = f ? ((r % 7 === 0 || r % 7 === 6 || c % 7 === 0 || c % 7 === 6 || (r % 7 >= 2 && r % 7 <= 4 && c % 7 >= 2 && c % 7 <= 4)) && !(r >= n - 7 && c >= n - 7)) : on; return dark ? <rect key={i} x={c * s} y={r * s} width={s} height={s} fill="#182433" /> : null; })}
    </svg>
  );
}
