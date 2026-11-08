import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Badge, Bar, Button, Card, ErrorBox, Icon, Loading } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import { checkUnlock, levelInfo } from "@/lib/gamification";
import { fmtDate, fmtDuration } from "@/lib/format";
import { QUEST_ICON, currentQuestProgress, ytThumb } from "./shared";

/** The learner's dashboard: level and XP, what to do next, today's quests, badges and the latest XP. */
export function HomePage() {
  const { user } = useAuth();
  const { t, pick, lang } = useI18n();
  const u = user!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [programs, lessons, progress, quests, questRows, badges, xp, board] = await Promise.all([
      api.programs(u.ownerId), api.lessons(), api.myProgress(), u.ownerId ? api.quests(u.ownerId) : Promise.resolve([]), api.myQuests(), api.badges(), api.myXpEvents(),
      api.leaderboard(null, "all"),
    ]);
    return { programs, lessons, progress, quests, questRows, badges, xp, board };
  }, [u.uid, u.xp]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;

  const lv = levelInfo(u.xp);
  const myPrograms = data.programs.filter((p) => p.published && u.enrolledProgramIds.includes(p.id));
  const openLessons = data.lessons.filter((l) => l.published && myPrograms.some((p) => p.id === l.programId));
  const next = openLessons
    .filter((l) => !data.progress.find((p) => p.lessonId === l.id)?.completed)
    .map((l) => ({ l, unlocked: checkUnlock(l, u, data.progress, data.questRows).ok, p: data.progress.find((p) => p.lessonId === l.id) }))
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || (b.p?.watchedPct ?? 0) - (a.p?.watchedPct ?? 0) || a.l.order - b.l.order)[0];
  const daily = data.quests.filter((q) => q.active && q.scope !== "program").slice(0, 3);
  const myRank = data.board.find((r) => r.isMe);
  const firstName = u.displayName.split(/\s+/)[0];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="hero">
        <div>
          <h1>{t("home.hello", { name: firstName })}</h1>
          <p>{t("home.sub")}</p>
          <div style={{ marginTop: 14, maxWidth: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              <span>{pick(lv.title)} · {u.xp} XP</span>
              <span>{lv.nextLevelXp ? t("home.toNext", { n: lv.xpToNext, lvl: lv.level + 1 }) : t("home.maxLevel")}</span>
            </div>
            <Bar pct={lv.pct} large />
          </div>
          <div className="row" style={{ marginTop: 12, gap: 14, fontSize: 13 }}>
            <span className="row" style={{ gap: 5 }}><Icon name="flame" size={15} color="#ffb347" /> {t("app.streak")} {t("app.daysN", { n: u.streakDays })}</span>
            <span className="row" style={{ gap: 5 }}><Icon name="trophy" size={15} color="#ffd36a" /> {u.badgeIds.length} {t("home.badges")}</span>
            {myRank && <span className="row" style={{ gap: 5 }}><Icon name="graph" size={15} /> {t("home.rank")} #{myRank.rank} {t("home.ofN", { n: data.board.length })}</span>}
          </div>
        </div>
        <div className="hero-level"><small>{t("app.level")}</small><b>{lv.level}</b></div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <Card title={t("home.nextUp")} actions={<Link to="/app/programs" className="btn btn-ghost">{t("home.seeAll")}</Link>}>
          {next ? (
            <Link to={`/app/lessons/${next.l.id}`} className="lesson-card" data-locked={!next.unlocked} style={{ border: 0, boxShadow: "none", padding: 0 }}>
              <div className="thumb">
                <img src={ytThumb(next.l.youtubeId)} alt="" loading="lazy" />
                <span className="ov"><Icon name={next.unlocked ? "play" : "lock"} size={26} /></span>
                <span className="dur">{fmtDuration(next.l.durationSec)}</span>
              </div>
              <div>
                <div className="eyebrow">{pick(myPrograms.find((p) => p.id === next.l.programId)?.title)}</div>
                <h3>{pick(next.l.title)}</h3>
                <p>{pick(next.l.summary)}</p>
                <div className="row" style={{ marginTop: 8 }}>
                  {next.p && next.p.watchedPct > 0 && <div style={{ flex: 1, minWidth: 80 }}><Bar pct={next.p.watchedPct} /></div>}
                  <Button size="sm" variant={next.unlocked ? "primary" : "secondary"} icon={next.unlocked ? "play" : "lock"}>{next.p && next.p.watchedPct > 0 ? t("home.continue") : t("home.start")}</Button>
                </div>
              </div>
            </Link>
          ) : (
            <div className="muted">{t("home.allDone")}</div>
          )}
        </Card>

        <Card title={t("home.todayQuests")} actions={<Link to="/app/quests" className="btn btn-ghost">{t("home.seeAll")}</Link>}>
          <div className="stack" style={{ gap: 10 }}>
            {daily.length === 0 && <div className="muted">{t("app.none")}</div>}
            {daily.map((q) => {
              const qp = currentQuestProgress(q, data.questRows);
              return (
                <div className="quest" key={q.id} data-done={qp.completed}>
                  <span className="ic"><Icon name={qp.completed ? "checkCircleFill" : QUEST_ICON[q.goal.type]} size={20} /></span>
                  <div>
                    <h4>{pick(q.title)}</h4>
                    <p>{t(`quests.${q.scope}`)} · {t(`quests.goal.${q.goal.type}`, { n: q.goal.target })}</p>
                    <Bar pct={(Math.min(qp.progress, q.goal.target) / q.goal.target) * 100} tone={qp.completed ? "ok" : undefined} />
                  </div>
                  <div className="rw">+{q.xpReward} XP<br /><span className="small muted" style={{ fontWeight: 500 }}>{Math.min(qp.progress, q.goal.target)}/{q.goal.target}</span></div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <Card title={t("home.badges")} actions={<Link to="/app/profile" className="btn btn-ghost">{t("home.seeAll")}</Link>}>
          <div className="row" style={{ gap: 14 }}>
            {data.badges.map((b) => {
              const has = u.badgeIds.includes(b.id);
              return (
                <div key={b.id} className="badge-tile" data-locked={!has} style={{ padding: "10px 8px", minWidth: 96, flex: "1 1 96px" }} title={pick(b.description)}>
                  <span className="ic" style={{ width: 42, height: 42 }}><Icon name={(b.icon as never) || "trophy"} size={20} /></span>
                  <b>{pick(b.name)}</b>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title={t("home.recent")}>
          {data.xp.length === 0 ? <div className="muted">{t("home.noXp")}</div> : (
            <table className="table">
              <tbody>
                {data.xp.slice(0, 6).map((e) => (
                  <tr key={e.id}>
                    <td style={{ width: 90 }}><Badge tone={e.kind === "quest" ? "accent" : e.kind === "streak" ? "warn" : "ok"}>{t(`xp.${e.kind}`)}</Badge></td>
                    <td>{e.note}</td>
                    <td className="muted small" style={{ whiteSpace: "nowrap" }}>{fmtDate(e.at, lang)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-accent-700)" }}>+{e.xp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
