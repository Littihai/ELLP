import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Button, ErrorBox, Icon, Loading } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import { fmtDate, fmtNum } from "@/lib/format";

/** A receipt the learner prints or saves as PDF (the browser's print dialog). */
export function ReceiptPage() {
  const { paymentId = "" } = useParams();
  const { user } = useAuth();
  const { t, pick, lang } = useI18n();
  const u = user!;
  const { data, error, loading } = useAsync(async () => {
    const [payments, owners] = await Promise.all([api.myPayments(), api.owners()]);
    const pay = payments.find((p) => p.id === paymentId) ?? null;
    return { pay, owner: owners.find((o) => o.id === pay?.ownerId) ?? null };
  }, [paymentId]);
  if (loading && !data) return <Loading />;
  if (error || !data?.pay) return <ErrorBox message={error ?? "PAYMENT_NOT_FOUND"} />;
  const p = data.pay;
  return (
    <>
      <div className="row no-print" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <Link to="/app/plan" className="btn btn-ghost"><Icon name="arrowLeft" size={14} /> {t("app.back")}</Link>
        <Button icon="checklist" onClick={() => window.print()}>{t("pay.print")}</Button>
      </div>
      <div className="paper" style={{ maxWidth: 680, margin: "0 auto", padding: "32px 36px", background: "#fff", color: "#182433", border: "1px solid #d6dbe1", borderRadius: 8 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div><div style={{ fontSize: 22, fontWeight: 700 }}>{t("pay.receipt")}</div><div style={{ color: "#667382" }}>{t("pay.receiptNo")}: <b>{p.receiptNo ?? "—"}</b></div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontWeight: 700 }}>{pick(data.owner?.name)}</div><div style={{ color: "#667382", fontSize: 13 }}>{data.owner?.contactEmail}</div></div>
        </div>
        <hr style={{ border: 0, borderTop: "1px solid #d6dbe1", margin: "18px 0" }} />
        <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
          <tbody>
            <tr><td style={{ padding: "6px 0", color: "#667382", width: 180 }}>{t("pay.payer")}</td><td>{u.displayName} · {u.email}</td></tr>
            <tr><td style={{ padding: "6px 0", color: "#667382" }}>{t("mail.when")}</td><td>{fmtDate(p.paidAt ?? p.createdAt, lang, true)}</td></tr>
            <tr><td style={{ padding: "6px 0", color: "#667382" }}>{t("pay.item")}</td><td>{t(`plan.${p.plan}`)}{p.planTrack && ` · ${t(`track.${p.planTrack}`)}`} · {t("pay.perMonths", { n: p.months })}</td></tr>
            <tr><td style={{ padding: "6px 0", color: "#667382" }}>{t("pay.method")}</td><td>{t(`pay.method.${p.method}`)} · {t("pay.ref")} {p.reference}</td></tr>
            <tr><td style={{ padding: "6px 0", color: "#667382" }}>{t("pay.expires")}</td><td>{u.planExpiresAt ? fmtDate(u.planExpiresAt, lang) : "—"}</td></tr>
          </tbody>
        </table>
        <div style={{ marginTop: 18, padding: "14px 16px", background: "#f6f8fb", borderRadius: 8, display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700 }}>
          <span>{t("pay.amount")}</span><span>{fmtNum(p.amount)} {p.currency}</span>
        </div>
        <div style={{ marginTop: 20, fontSize: 12, color: "#667382" }}>{t("pay.issuedBy")} ELLP · {p.id}</div>
      </div>
      <style>{`@media print { .app-header, .app-footer, .learn-bottom, .chat-fab, .chat-panel, .no-print { display: none !important; } .page { padding: 0 !important; } body { background: #fff; } }`}</style>
    </>
  );
}
