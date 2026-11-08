import { useState } from "react";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, EmptyState, ErrorBox, Loading, PageHeader } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { fmtDate, fmtNum } from "@/lib/format";
import type { Payment } from "@/types";

/** Every payment of the tenant: confirm a transfer, refund, mark failed. A confirmed transfer activates the plan and numbers a receipt. */
export function PaymentsPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { ownerId } = useScope();
  const { data, error, loading, reload } = useAsync(async () => {
    const [payments, members] = await Promise.all([api.payments(ownerId!), api.members(ownerId!)]);
    return { payments, members };
  }, [ownerId]);
  const [filter, setFilter] = useState<"all" | Payment["status"]>("all");
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const name = (uid: string) => data.members.find((m) => m.uid === uid)?.displayName ?? uid;
  const rows = data.payments.filter((p) => filter === "all" || p.status === filter);
  const tone = (s: Payment["status"]) => (s === "paid" ? "ok" : s === "pending" ? "warn" : s === "refunded" ? "neutral" : "stop");
  const act = async (p: Payment, s: "paid" | "refunded" | "failed") => { await api.setPaymentStatus(p.id, s); toast(t("app.saved")); reload(); };
  const paidTotal = data.payments.filter((p) => p.status === "paid").reduce((n, p) => n + p.amount, 0);

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("apy.title")} sub={t("apy.sub")} actions={<Badge tone="ok">{t("pay.paid")}: {fmtNum(paidTotal)} ฿</Badge>} />
      <div className="row" style={{ marginBottom: 12, gap: 6 }}>
        {(["all", "pending", "paid", "refunded", "failed"] as const).map((f) => <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "all" ? t("mem.filter.all") : t(`pay.${f}`)} ({f === "all" ? data.payments.length : data.payments.filter((p) => p.status === f).length})</button>)}
      </div>
      <Card pad="0">
        {rows.length === 0 ? <EmptyState icon="checklist" title={t("app.none")} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t("mail.when")}</th><th>{t("mem.name")}</th><th>{t("plan")}</th><th>{t("pay.method")}</th><th>{t("apy.provider")}</th><th>{t("pay.amount")}</th><th>{t("pay.ref")}</th><th>{t("mail.status")}</th><th>{t("pay.receipt")}</th><th></th></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="small muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(p.createdAt, lang, true)}</td>
                    <td><b>{name(p.uid)}</b></td>
                    <td>{t(`plan.${p.plan}`)}{p.planTrack && <span className="small muted"> · {t(`track.${p.planTrack}`)}</span>}</td>
                    <td className="small">{t(`pay.method.${p.method}`)}</td>
                    <td className="small muted">{p.provider}</td>
                    <td>{fmtNum(p.amount)} ฿</td>
                    <td className="small" style={{ maxWidth: 200 }}>{p.reference}{p.note && <div className="muted">{p.note}</div>}</td>
                    <td><Badge tone={tone(p.status)}>{t(`pay.${p.status}`)}</Badge></td>
                    <td className="small">{p.receiptNo ?? "—"}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {p.status === "pending" && <><Button size="sm" variant="success" icon="check" onClick={() => act(p, "paid")}>{t("apy.markPaid")}</Button>{" "}<Button size="sm" variant="tertiary" onClick={() => act(p, "failed")}>{t("apy.fail")}</Button></>}
                      {p.status === "paid" && <Button size="sm" variant="tertiary" onClick={() => { if (window.confirm(t("app.confirmDelete"))) act(p, "refunded"); }}>{t("apy.refund")}</Button>}
                    </td>
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
