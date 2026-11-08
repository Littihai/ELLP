import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Card, ErrorBox, Icon, Loading } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { api, type PublicProgram } from "@/services";
import { TRACKS, type Track } from "@/types";
import { Thumb } from "@/modules/learn/shared";

/** The front door: what the platform is, the programs by goal, the providers, and how to start. */
export function LandingPage({ catalogOnly = false }: { catalogOnly?: boolean }) {
  const { t, pick } = useI18n();
  const { data, error, loading, reload } = useAsync(() => api.publicPrograms(), []);
  const [track, setTrack] = useState<Track | "all">("all");
  if (loading && !data) return <Loading />;
  if (error || !data) return <div className="page"><ErrorBox message={error ?? "?"} onRetry={reload} /></div>;
  const rows = data.filter((r) => track === "all" || r.program.track === track);
  const owners = Array.from(new Map(data.map((r) => [r.owner.id, r.owner])).values());

  return (
    <>
      {!catalogOnly && (
        <section style={{ background: "linear-gradient(135deg, var(--color-brand-deep), color-mix(in srgb, var(--color-brand-deep) 70%, var(--color-accent)))", color: "var(--color-on-brand-deep)" }}>
          <div className="page" style={{ padding: "56px var(--page-pad) 48px" }}>
            <div style={{ maxWidth: 720 }}>
              <h1 style={{ margin: 0, fontSize: "clamp(26px, 4.5vw, 40px)", lineHeight: 1.2, fontWeight: 700 }}>{t("pub.hero")}</h1>
              <p style={{ fontSize: "var(--text-lg)", opacity: 0.9, margin: "14px 0 24px" }}>{t("pub.heroSub")}</p>
              <div className="row">
                <Link to="/signup" className="btn btn-primary btn-lg" style={{ background: "#fff", color: "var(--color-brand-deep)" }}>{t("pub.signUp")} <Icon name="arrowRight" size={16} /></Link>
                <a href="#catalog" className="btn btn-secondary btn-lg" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.5)" }}>{t("pub.browse")}</a>
              </div>
            </div>
            <div className="grid-stats" style={{ marginTop: 36, gap: 14 }}>
              {(["step1", "step2", "step3"] as const).map((s, i) => (
                <div key={s} style={{ background: "rgba(255,255,255,0.1)", borderRadius: "var(--radius-xl)", padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: "50%", background: "#fff", color: "var(--color-brand-deep)", fontWeight: 800 }}>{i + 1}</span>
                  <span style={{ fontSize: "var(--text-sm)" }}>{t(`pub.${s}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="page" id="catalog">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-2xl)" }}>{t("pub.catalog")}</h2>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="chip" aria-pressed={track === "all"} onClick={() => setTrack("all")}>{t("track.all")}</button>
            {TRACKS.map((tr) => <button key={tr} type="button" className="chip" aria-pressed={track === tr} onClick={() => setTrack(tr)}>{t(`track.${tr}`)}</button>)}
          </div>
        </div>
        <div className="grid-cards">{rows.map((r) => <ProgramCard key={r.program.id} row={r} />)}</div>

        {!catalogOnly && (
          <>
            <h2 style={{ margin: "40px 0 12px", fontSize: "var(--text-xl)" }}>{t("pub.providers")}</h2>
            <div className="row" style={{ gap: 10 }}>
              {owners.map((o) => <Badge key={o.id} tone="neutral"><Icon name="organization" size={12} />{pick(o.name)} · {data.filter((r) => r.owner.id === o.id).length} {t("nav.programs").toLowerCase()}</Badge>)}
            </div>
            <Card style={{ marginTop: 40, textAlign: "center" }} pad="32px 24px">
              <h2 style={{ margin: 0, fontSize: "var(--text-2xl)" }}>{t("pub.ctaTitle")}</h2>
              <p className="muted">{t("pub.ctaSub")}</p>
              <div className="row" style={{ justifyContent: "center" }}>
                <Link to="/signup" className="btn btn-primary">{t("pub.signUp")}</Link>
                <Link to="/login" className="btn btn-secondary">{t("pub.signIn")}</Link>
              </div>
            </Card>
          </>
        )}
      </section>
    </>
  );
}

export function ProgramCard({ row }: { row: PublicProgram }) {
  const { t, pick } = useI18n();
  const p = row.program;
  return (
    <Card pad="0" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative" }}>
        <Thumb youtubeId={row.preview?.youtubeId ?? ""} color={p.color} />
        <span style={{ position: "absolute", top: 8, left: 8 }}><Badge tone={p.plan === "free" ? "ok" : p.plan === "pro" ? "accent" : "warn"}>{t(`plan.${p.plan}`)}</Badge></span>
      </div>
      <div style={{ padding: "12px 16px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="row" style={{ gap: 6 }}>
          <Badge tone="neutral">{t(`track.${p.track}`)}</Badge>
          <Badge tone="neutral">{p.cefr}</Badge>
          {p.targetScore && <Badge tone="accent"><Icon name="zap" size={11} />{p.targetScore}</Badge>}
        </div>
        <h3 style={{ margin: "8px 0 4px", fontSize: "var(--text-lg)" }}>{pick(p.title)}</h3>
        <p className="muted" style={{ margin: 0, fontSize: "var(--text-sm)", flex: 1 }}>{pick(p.description)}</p>
        <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
          <span className="small muted">{t("pub.by")} {pick(row.owner.name)} · {t("pub.lessonsN", { n: row.lessonCount })}</span>
          <Link to={`/catalog/${p.id}`} className="btn btn-secondary btn-sm">{t("pub.details")} <Icon name="chevronRight" size={14} /></Link>
        </div>
      </div>
    </Card>
  );
}
