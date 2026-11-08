import { useState } from "react";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, EmptyState, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { fmtDate } from "@/lib/format";
import type { InboxMessage } from "@/types";

type Filter = "open" | "answered" | "closed" | "all";

/**
 * Messages from learners and parents. A reply is stored on the thread and emailed to the sender through the tenant's
 * email settings; the page says what happened to the email (sent, redirected by test mode, suppressed).
 */
export function InboxPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { ownerId } = useScope();
  const oid = ownerId!;
  const { data, error, loading, reload } = useAsync(() => api.inbox(oid), [oid]);
  const [filter, setFilter] = useState<Filter>("open");
  const [selId, setSelId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const rows = data.filter((m) => filter === "all" || m.status === filter);
  const sel = data.find((m) => m.id === selId) ?? null;
  const tone = (s: InboxMessage["status"]) => (s === "open" ? "warn" : s === "answered" ? "ok" : "neutral");
  const count = (s: Filter) => (s === "all" ? data.length : data.filter((m) => m.status === s).length);

  const send = async () => {
    if (!sel || !body.trim()) return;
    setBusy(true);
    try {
      const { mail } = await api.replyMessage(sel.id, body);
      toast(t(`inb.sent.${mail.status}`, { to: mail.to }), mail.status === "sent" ? "ok" : mail.status === "failed" ? "stop" : "warn");
      setBody(""); reload();
    } finally { setBusy(false); }
  };
  const setStatus = async (s: InboxMessage["status"]) => { if (sel) { await api.setMessageStatus(sel.id, s); reload(); } };

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("inb.title")} sub={t("inb.sub")} />
      <div className="row" style={{ marginBottom: 12, gap: 6 }}>
        {(["open", "answered", "closed", "all"] as Filter[]).map((f) => <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{t(`inb.filter.${f}`)} ({count(f)})</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(0, 2fr)", gap: 16, alignItems: "start" }} className="inbox-grid">
        <Card pad="0">
          {rows.length === 0 ? <EmptyState icon="inbox" title={t("app.none")} /> : rows.map((m) => (
            <button key={m.id} type="button" className="row-click" onClick={() => { setSelId(m.id); setBody(""); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", border: 0, borderBottom: "1px solid var(--color-neutral-100)", background: m.id === selId ? "var(--color-accent-100)" : "transparent", font: "inherit", color: "inherit" }}>
              <div className="row" style={{ justifyContent: "space-between" }}><b style={{ fontSize: "var(--text-sm)" }}>{m.fromName}</b><Badge tone={tone(m.status)}>{t(`contact.status.${m.status}`)}</Badge></div>
              <div style={{ fontSize: "var(--text-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject}</div>
              <div className="small muted">{fmtDate(m.createdAt, lang, true)}</div>
            </button>
          ))}
        </Card>
        <Card>
          {!sel ? <EmptyState icon="comment" title={t("inb.select")} /> : (
            <div className="stack">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "var(--text-xl)" }}>{sel.subject}</h2>
                  <div className="small muted">{t("inb.from")}: <b>{sel.fromName}</b> &lt;{sel.fromEmail}&gt; · {fmtDate(sel.createdAt, lang, true)}</div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <Badge tone={tone(sel.status)}>{t(`contact.status.${sel.status}`)}</Badge>
                  {sel.status !== "closed" ? <Button size="sm" variant="tertiary" onClick={() => setStatus("closed")}>{t("inb.close")}</Button> : <Button size="sm" variant="tertiary" onClick={() => setStatus("open")}>{t("inb.reopen")}</Button>}
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: "var(--radius-lg)", background: "var(--color-neutral-50)", whiteSpace: "pre-wrap" }}>{sel.body}</div>
              {sel.replies.map((r) => (
                <div key={r.id} style={{ padding: "12px 14px", borderRadius: "var(--radius-lg)", background: "var(--color-accent-100)", marginLeft: 24 }}>
                  <div className="small" style={{ fontWeight: 600, color: "var(--color-accent-800)" }}><Icon name="mail" size={12} /> {r.byName} · {fmtDate(r.at, lang, true)}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{r.body}</div>
                </div>
              ))}
              {sel.status !== "closed" && (
                <div className="stack" style={{ gap: 8 }}>
                  <label className="eyebrow" htmlFor="reply">{t("inb.reply")}</label>
                  <textarea id="reply" className="input" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("inb.replyPlaceholder", { email: sel.fromEmail })} />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}><Button icon="paperAirplane" busy={busy} disabled={!body.trim()} onClick={send}>{t("inb.send")}</Button></div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
      <style>{`@media (max-width: 860px) { .inbox-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
