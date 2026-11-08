import { useState, type FormEvent } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Loading, PageHeader } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import { fmtDate } from "@/lib/format";

/** A learner (or the parent on their account) writes to the owner's admins; the admins answer by email, and the thread shows it. */
export function ContactPage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const u = user!;
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useAsync(() => api.myMessages(), [u.uid]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setBusy(true);
    try { await api.sendMessage(subject, body); setSubject(""); setBody(""); toast(t("contact.sent")); reload(); } finally { setBusy(false); }
  };
  const tone = (s: string) => (s === "open" ? "warn" : s === "answered" ? "ok" : "neutral");

  return (
    <>
      <PageHeader pretitle={t("nav.contact")} title={t("contact.title")} sub={t("contact.sub", { email: u.email })} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
        <Card>
          <form onSubmit={send} className="stack" style={{ gap: 12 }}>
            <Field label={t("contact.subject")}><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={120} /></Field>
            <Field label={t("contact.body")}><textarea className="input" rows={6} value={body} onChange={(e) => setBody(e.target.value)} required maxLength={2000} /></Field>
            <div style={{ display: "flex", justifyContent: "flex-end" }}><Button type="submit" icon="paperAirplane" busy={busy} disabled={!subject.trim() || !body.trim()}>{t("contact.send")}</Button></div>
          </form>
        </Card>
        <Card title={t("contact.mine")}>
          {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data || data.length === 0 ? <EmptyState icon="comment" title={t("app.none")} /> : (
            <div className="stack" style={{ gap: 12 }}>
              {data.map((m) => (
                <div key={m.id} style={{ borderBottom: "1px solid var(--color-neutral-100)", paddingBottom: 12 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <b>{m.subject}</b>
                    <Badge tone={tone(m.status)}>{t(`contact.status.${m.status}`)}</Badge>
                  </div>
                  <div className="small muted">{fmtDate(m.createdAt, lang, true)}</div>
                  <p style={{ margin: "6px 0", fontSize: "var(--text-sm)" }}>{m.body}</p>
                  {m.replies.map((r) => (
                    <div key={r.id} style={{ marginTop: 8, padding: "10px 12px", borderRadius: "var(--radius-lg)", background: "var(--color-accent-100)", fontSize: "var(--text-sm)" }}>
                      <div className="small" style={{ fontWeight: 600, color: "var(--color-accent-800)" }}>{t("contact.replyFrom", { name: r.byName })} · {fmtDate(r.at, lang, true)}</div>
                      <div>{r.body}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
