import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, EmptyState, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { NeedOwner, useScope } from "@/layouts/AdminShell";
import { api } from "@/services";
import { fmtDate } from "@/lib/format";

/** The admins' side of the chat: visitors and learners of this tenant, newest first; reply, close, or create the account from the chat. */
export function ChatAdminPage() {
  return <NeedOwner><Inner /></NeedOwner>;
}

function Inner() {
  const { t, lang } = useI18n();
  const { ownerId } = useScope();
  const nav = useNavigate();
  const { data, error, loading, reload } = useAsync(() => api.chatThreads(ownerId!), [ownerId]);
  const [selId, setSelId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const id = window.setInterval(reload, 5000); return () => window.clearInterval(id); }, [reload]);
  const sel = data?.find((c) => c.id === selId) ?? null;
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [sel?.messages.length]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;

  const send = async () => { if (!sel || !text.trim()) return; setBusy(true); try { await api.chatReply(sel.id, text); setText(""); reload(); } finally { setBusy(false); } };
  const setStatus = async (s: "open" | "closed") => { if (sel) { await api.chatSetStatus(sel.id, s); reload(); } };
  const createAccount = () => { if (sel) nav(`/admin/members?new=1&name=${encodeURIComponent(sel.name)}&email=${encodeURIComponent(sel.email)}&chat=${sel.id}`); };

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("apm.title")} sub={t("apm.sub")} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) minmax(0, 2fr)", gap: 16, alignItems: "start" }} className="inbox-grid">
        <Card pad="0">
          {data.length === 0 ? <EmptyState icon="comment" title={t("app.none")} /> : data.map((c) => (
            <button key={c.id} type="button" className="row-click" onClick={() => setSelId(c.id)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", border: 0, borderBottom: "1px solid var(--color-neutral-100)", background: c.id === selId ? "var(--color-accent-100)" : "transparent", font: "inherit", color: "inherit" }}>
              <div className="row" style={{ justifyContent: "space-between" }}><b style={{ fontSize: "var(--text-sm)" }}>{c.name}</b><Badge tone={c.status === "open" ? "warn" : "neutral"}>{c.uid ? t("apm.learner") : t("apm.visitor")}{c.status === "closed" && ` · ${t("contact.status.closed")}`}</Badge></div>
              <div className="small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.messages[c.messages.length - 1]?.text}</div>
              <div className="small muted">{fmtDate(c.updatedAt, lang, true)}</div>
            </button>
          ))}
        </Card>
        <Card>
          {!sel ? <EmptyState icon="comment" title={t("apm.select")} /> : (
            <div className="stack">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div><h2 style={{ margin: 0, fontSize: "var(--text-xl)" }}>{sel.name}</h2><div className="small muted">{sel.email} · {sel.uid ? t("apm.learner") : t("apm.visitor")}</div></div>
                <div className="row" style={{ gap: 6 }}>
                  {!sel.uid && !sel.linkedUid && <Button size="sm" variant="secondary" icon="person" onClick={createAccount}>{t("apm.createAccount")}</Button>}
                  {sel.linkedUid && <Badge tone="ok"><Icon name="checkCircle" size={11} />{t("apm.linked")}</Badge>}
                  {sel.uid && <Button size="sm" variant="secondary" icon="checklist" onClick={() => nav("/admin/approvals")}>{t("adm.approvals")}</Button>}
                  {sel.status === "open" ? <Button size="sm" variant="tertiary" onClick={() => setStatus("closed")}>{t("apm.close")}</Button> : <Button size="sm" variant="tertiary" onClick={() => setStatus("open")}>{t("apm.reopen")}</Button>}
                </div>
              </div>
              <div className="chat-body" style={{ maxHeight: 420, border: "1px solid var(--color-neutral-200)", borderRadius: "var(--radius-lg)" }}>
                {sel.messages.map((m) => (
                  <div key={m.id} className="chat-msg" data-from={m.from === "admin" ? "visitor" : "admin"}>
                    <div className="small muted">{m.byName} · {fmtDate(m.at, lang, true)}</div>
                    <div className="bubble">{m.text}</div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <input className="input" placeholder={t("chat.placeholder")} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
                <Button icon="paperAirplane" busy={busy} disabled={!text.trim()} onClick={send}>{t("chat.send")}</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
      <style>{`@media (max-width: 860px) { .inbox-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
