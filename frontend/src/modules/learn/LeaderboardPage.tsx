import { useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Avatar, Card, EmptyState, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { api, type LeaderboardPeriod } from "@/services";
import { ageRuleFor } from "@/lib/gamification";

/** Learners of the same owner ranked by XP, this week or all time, for every program or one. */
export function LeaderboardPage() {
  const { user } = useAuth();
  const { t, pick } = useI18n();
  const u = user!;
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [programId, setProgramId] = useState<string | null>(null);
  const { data, error, loading, reload } = useAsync(async () => {
    const [rows, programs, settings] = await Promise.all([api.leaderboard(programId, period), api.programs(u.ownerId), u.ownerId ? api.settings(u.ownerId) : Promise.resolve(null)]);
    return { rows, programs: programs.filter((p) => p.published), visible: settings?.leaderboard.visible ?? true, ageVisible: ageRuleFor(settings, u).leaderboardVisible };
  }, [period, programId, u.uid, u.xp]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;

  return (
    <>
      <PageHeader pretitle={t("nav.leaderboard")} title={t("lb.title")} sub={t("lb.sub")} />
      {!data.visible ? <EmptyState icon="trophy" title={t("lb.hidden")} /> : !data.ageVisible ? <EmptyState icon="trophy" title={t("lb.hiddenAge")} /> : (
        <Card>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <div className="row" style={{ gap: 6 }}>
              {(["week", "all"] as const).map((p) => <button key={p} type="button" className="chip" aria-pressed={period === p} onClick={() => setPeriod(p)}>{t(`lb.${p}`)}</button>)}
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="chip" aria-pressed={programId === null} onClick={() => setProgramId(null)}>{t("lb.allPrograms")}</button>
              {data.programs.map((p) => <button key={p.id} type="button" className="chip" aria-pressed={programId === p.id} onClick={() => setProgramId(p.id)}>{pick(p.title)}</button>)}
            </div>
          </div>
          {data.rows.length === 0 ? <EmptyState icon="trophy" title={t("app.none")} /> : (
            <div className="stack" style={{ gap: 4 }}>
              {data.rows.map((r) => (
                <div className="lb-row" key={r.uid} data-me={r.isMe} data-rank={r.rank}>
                  <span className="rk">{r.rank <= 3 ? <Icon name="trophy" size={18} /> : r.rank}</span>
                  <Avatar name={r.displayName} color={r.avatarColor} size={36} />
                  <span style={{ minWidth: 0 }}>
                    <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.displayName}{r.isMe && <span className="muted"> · {t("lb.you")}</span>}</b>
                    <span className="small muted">{t("app.levelN", { n: r.level })}</span>
                  </span>
                  <b style={{ color: "var(--color-accent-700)", whiteSpace: "nowrap" }}>{r.xp} XP</b>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
