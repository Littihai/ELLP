import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Button, Icon } from "@/components/ui/kit";
import { api, visitorKey } from "@/services";
import { fmtDate } from "@/lib/format";
import type { ChatThread, Owner } from "@/types";

/**
 * The chat bubble (bottom right) on the public pages and the learner pages: a visitor picks the school to talk to, gives a
 * name and an email once, and chats; a signed-in learner chats as themselves with their own tenant. The thread is polled every
 * few seconds in demo mode (Firestore listeners replace this in live mode). A LINE button appears when the tenant has one.
 */
export function ChatWidget({ owners, defaultOwnerId }: { owners: Owner[]; defaultOwnerId?: string | null }) {
  const { user } = useAuth();
  const { t, pick, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [ownerId, setOwnerId] = useState<string>(user?.ownerId ?? defaultOwnerId ?? owners[0]?.id ?? "");
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [lineUrl, setLineUrl] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const vk = user ? null : visitorKey();

  useEffect(() => { if (user?.ownerId) setOwnerId(user.ownerId); else if (defaultOwnerId) setOwnerId(defaultOwnerId); }, [user?.ownerId, defaultOwnerId]);
  useEffect(() => { if (!ownerId) return; api.publicProgram; api.settings(ownerId).then((s) => setLineUrl(s.lineUrl)).catch(() => setLineUrl("")); }, [ownerId]);

  // load, then poll while open
  useEffect(() => {
    if (!open || !ownerId) return;
    let alive = true;
    const load = () => api.chatThread(ownerId, vk).then((c) => { if (alive) setThread(c); }).catch(() => undefined);
    load();
    const id = window.setInterval(load, 4000);
    return () => { alive = false; window.clearInterval(id); };
  }, [open, ownerId, vk]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [thread?.messages.length, open]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !ownerId) return;
    if (!user && (!name.trim() || !email.trim())) return;
    setBusy(true);
    try { setThread(await api.chatSend(ownerId, vk, name, email, text)); setText(""); } finally { setBusy(false); }
  };
  const owner = owners.find((o) => o.id === ownerId);
  const needsIdentity = !user && !thread;

  return (
    <>
      <button type="button" className="chat-fab" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={t("chat.title")}>
        <Icon name={open ? "x" : "comment"} size={22} />
      </button>
      {open && (
        <div className="chat-panel" role="dialog" aria-label={t("chat.title")}>
          <div className="chat-head">
            <div>
              <b>{t("chat.title")}</b>
              <div className="small" style={{ opacity: 0.85 }}>{t("chat.sub")}</div>
            </div>
          </div>
          <div className="chat-owner">
            <Icon name="organization" size={14} />
            {user ? <span>{t("chat.with")}: {pick(owner?.name)}</span> : (
              <select value={ownerId} onChange={(e) => { setOwnerId(e.target.value); setThread(null); }} aria-label={t("chat.with")}>
                {owners.map((o) => <option key={o.id} value={o.id}>{pick(o.name)}</option>)}
              </select>
            )}
            {lineUrl && <a className="btn btn-secondary btn-sm" href={lineUrl} target="_blank" rel="noreferrer" style={{ marginLeft: "auto", background: "#06c755", color: "#fff", borderColor: "#06c755" }}>{t("chat.line")}</a>}
          </div>
          <div className="chat-body">
            {!thread || thread.messages.length === 0 ? <div className="muted small" style={{ textAlign: "center", padding: 20 }}>{t("chat.empty")}</div> : thread.messages.map((m) => (
              <div key={m.id} className="chat-msg" data-from={m.from}>
                <div className="small muted">{m.from === "visitor" ? t("chat.you") : m.byName} · {fmtDate(m.at, lang, true)}</div>
                <div className="bubble">{m.text}</div>
              </div>
            ))}
            {thread?.status === "closed" && <div className="small muted" style={{ textAlign: "center" }}>{t("chat.closed")}</div>}
            <div ref={endRef} />
          </div>
          <form className="chat-form" onSubmit={send}>
            {needsIdentity && (
              <div className="row" style={{ gap: 6 }}>
                <input className="input" placeholder={t("chat.name")} value={name} onChange={(e) => setName(e.target.value)} required style={{ minHeight: 36, padding: "6px 10px", fontSize: 13 }} />
                <input className="input" type="email" placeholder={t("chat.email")} value={email} onChange={(e) => setEmail(e.target.value)} required style={{ minHeight: 36, padding: "6px 10px", fontSize: 13 }} />
              </div>
            )}
            <div className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
              <input className="input" placeholder={t("chat.placeholder")} value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 40, padding: "8px 12px" }} />
              <Button type="submit" size="sm" icon="paperAirplane" busy={busy} disabled={!text.trim() || (!user && (!name.trim() || !email.trim()))}>{t("chat.send")}</Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
