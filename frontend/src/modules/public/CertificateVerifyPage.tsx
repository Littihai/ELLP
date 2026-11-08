import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Button, Card, Icon, Loading } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import { fmtDate } from "@/lib/format";

/**
 * /certificate/:code — the certificate itself (printable) with its verification result; /verify — a box to type a code.
 * Public: a parent or an employer needs no account.
 */
export function CertificateVerifyPage() {
  const { code = "" } = useParams();
  const { t, pick, lang } = useI18n();
  const nav = useNavigate();
  const [input, setInput] = useState("");
  const { data, loading } = useAsync(() => (code ? api.verifyCertificate(code) : Promise.resolve(null)), [code]);
  const submit = (e: FormEvent) => { e.preventDefault(); if (input.trim()) nav(`/certificate/${input.trim().toUpperCase()}`); };
  const url = `${window.location.origin}/certificate/${code}`;

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <Card className="no-print" style={{ marginBottom: 16 }}>
        <form onSubmit={submit} className="row" style={{ flexWrap: "nowrap" }}>
          <Icon name="shieldLock" size={18} />
          <input className="input" placeholder={t("cert.verifyInput")} value={input} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit" icon="search">{t("cert.verify")}</Button>
        </form>
      </Card>
      {code && loading && data === null && <Loading />}
      {code && !loading && !data && <Card><div className="row"><Icon name="alert" size={18} color="var(--tone-stop-solid)" /><b>{t("cert.invalid")}</b> <code>{code}</code></div></Card>}
      {data && (
        <>
          <div className="row no-print" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <Badge tone="ok"><Icon name="checkCircleFill" size={12} />{t("cert.valid")}</Badge>
            <Button icon="checklist" onClick={() => window.print()}>{t("pay.print")}</Button>
          </div>
          <div className="paper" style={{ background: "#fff", color: "#182433", border: "10px double #182433", padding: "44px 48px", textAlign: "center", borderRadius: 4 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.3em", textTransform: "uppercase", color: "#667382" }}>ELLP · {pick(data.ownerName)}</div>
            <h1 style={{ fontSize: 34, margin: "14px 0 6px", fontWeight: 700 }}>{t("cert.heading")}</h1>
            <div style={{ color: "#667382" }}>{t("cert.awarded")}</div>
            <div style={{ fontSize: 30, fontWeight: 700, margin: "10px 0", color: "#066fd1" }}>{data.learnerName}</div>
            <div style={{ color: "#667382" }}>{t("cert.completed")}</div>
            <div style={{ fontSize: 22, fontWeight: 600, margin: "8px 0 4px" }}>{pick(data.programTitle)}</div>
            <div style={{ color: "#49566c" }}>{t(`track.${data.track}`)} · CEFR {data.cefr} · {t("cert.lessonsXp", { n: data.lessons, xp: data.xpEarned })}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36, fontSize: 13, color: "#49566c" }}>
              <div style={{ textAlign: "left" }}><div>{t("cert.issued")}</div><b>{fmtDate(data.issuedAt, lang)}</b></div>
              <div style={{ textAlign: "right" }}><div>{t("cert.code")}</div><b style={{ fontFamily: "monospace", fontSize: 16 }}>{data.code}</b></div>
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: "#929dab" }}>{t("cert.verifyHint", { url })}</div>
          </div>
        </>
      )}
      <style>{`@media print { .app-header, .app-footer, .chat-fab, .chat-panel, .no-print { display: none !important; } .page { padding: 0 !important; max-width: none !important; } body { background: #fff; } }`}</style>
    </div>
  );
}
