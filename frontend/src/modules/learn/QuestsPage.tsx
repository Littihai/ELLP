import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Bar, Card, EmptyState, ErrorBox, Icon, Loading, PageHeader } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import type { QuestScope } from "@/types";
import { QUEST_ICON, currentQuestProgress } from "./shared";

/** Daily, weekly and long-term quests with the learner's progress in the current period. */
export function QuestsPage() {
  const { user } = useAuth();
  const { t, pick } = useI18n();
  const u = user!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [quests, rows, badges] = await Promise.all([u.ownerId ? api.quests(u.ownerId) : Promise.resolve([]), api.myQuests(), api.badges()]);
    return { quests: quests.filter((q) => q.active), rows, badges };
  }, [u.uid, u.xp]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const scopes: QuestScope[] = ["daily", "weekly", "program"];

  return (
    <>
      <PageHeader pretitle={t("nav.quests")} title={t("quests.title")} sub={t("quests.sub")} />
      {data.quests.length === 0 && <EmptyState icon="rocket" title={t("app.none")} />}
      <div className="stack" style={{ gap: 20 }}>
        {scopes.map((s) => {
          const qs = data.quests.filter((q) => q.scope === s);
          if (qs.length === 0) return null;
          return (
            <Card key={s} title={t(`quests.${s}`)}>
              <div className="stack" style={{ gap: 10 }}>
                {qs.map((q) => {
                  const qp = currentQuestProgress(q, data.rows);
                  const badge = q.badgeId ? data.badges.find((b) => b.id === q.badgeId) : null;
                  return (
                    <div className="quest" key={q.id} data-done={qp.completed}>
                      <span className="ic"><Icon name={qp.completed ? "checkCircleFill" : QUEST_ICON[q.goal.type]} size={20} /></span>
                      <div style={{ minWidth: 0 }}>
                        <h4>{pick(q.title)}</h4>
                        <p>{t(`quests.goal.${q.goal.type}`, { n: q.goal.target })}{pick(q.description) && <> · {pick(q.description)}</>}</p>
                        <Bar pct={(Math.min(qp.progress, q.goal.target) / q.goal.target) * 100} tone={qp.completed ? "ok" : undefined} />
                      </div>
                      <div className="rw">
                        {qp.completed ? <span style={{ color: "var(--tone-ok-fg)" }}>{t("quests.complete")}</span> : <>+{q.xpReward} XP</>}
                        <br /><span className="small muted" style={{ fontWeight: 500 }}>{Math.min(qp.progress, q.goal.target)}/{q.goal.target}{badge && <> · <Icon name="trophy" size={11} /> {pick(badge.name)}</>}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
