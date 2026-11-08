import { useNavigate } from "react-router-dom";
import { useI18n } from "@/app/providers/I18nProvider";
import { Card, ErrorBox, Loading, PageHeader, StatCard } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { useScope } from "@/layouts/AdminShell";
import { api } from "@/services";

/** The console's first page: the tenant's numbers, XP over 14 days, the most completed lessons. */
export function DashboardPage() {
  const { t, pick } = useI18n();
  const { ownerId, owners } = useScope();
  const nav = useNavigate();
  const { data, error, loading, reload } = useAsync(() => api.adminStats(ownerId), [ownerId]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const owner = owners.find((o) => o.id === ownerId);
  const max = Math.max(1, ...data.xpByDay.map((d) => d.xp));

  return (
    <>
      <PageHeader pretitle={t("adm.console")} title={t("adm.dashboard")} sub={owner ? pick(owner.name) : t("adm.allOwners")} />
      <div className="grid-stats" style={{ marginBottom: 16 }}>
        <StatCard icon="people" label={t("adm.stat.learners")} value={data.learners} sub={`${t("adm.stat.activeToday")}: ${data.activeToday}`} onClick={() => nav("/admin/members")} />
        <StatCard icon="book" label={t("adm.stat.programs")} value={data.programs} sub={`${t("adm.stat.lessons")}: ${data.lessons}`} tone="neutral" onClick={() => nav("/admin/programs")} />
        <StatCard icon="inbox" label={t("adm.stat.open")} value={data.openMessages} tone={data.openMessages > 0 ? "warn" : "ok"} onClick={() => nav("/admin/inbox")} />
        <StatCard icon="zap" label={t("adm.stat.xpWeek")} value={data.xpThisWeek} tone="accent" />
        <StatCard icon="checkCircle" label={t("adm.stat.doneWeek")} value={data.completionsThisWeek} tone="ok" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)", gap: 16 }} className="dash-grid">
        <Card title={t("adm.chart.xp")}>
          <svg viewBox="0 0 560 180" role="img" aria-label={t("adm.chart.xp")} style={{ width: "100%", height: "auto", display: "block" }}>
            {data.xpByDay.map((d, i) => {
              const w = 560 / data.xpByDay.length, bw = w * 0.6, h = (d.xp / max) * 140;
              return (
                <g key={d.day}>
                  <rect x={i * w + (w - bw) / 2} y={150 - h} width={bw} height={h} rx={3} fill="var(--chart-1)" opacity={0.9}><title>{d.day}: {d.xp} XP</title></rect>
                  {d.xp > 0 && <text x={i * w + w / 2} y={144 - h} textAnchor="middle" fontSize="10" fill="var(--color-neutral-600)">{d.xp}</text>}
                  <text x={i * w + w / 2} y={170} textAnchor="middle" fontSize="9" fill="var(--color-neutral-500)">{d.day.slice(5)}</text>
                </g>
              );
            })}
            <line x1="0" y1="150" x2="560" y2="150" stroke="var(--color-neutral-300)" />
          </svg>
        </Card>
        <Card title={t("adm.topLessons")}>
          <table className="table">
            <tbody>
              {data.topLessons.map((r) => (
                <tr key={r.lesson.id} className="row-click" onClick={() => nav(`/admin/lessons?edit=${r.lesson.id}`)}>
                  <td>{pick(r.lesson.title)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>{r.completions} <span className="muted small">{t("adm.completions")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <style>{`@media (max-width: 900px) { .dash-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
