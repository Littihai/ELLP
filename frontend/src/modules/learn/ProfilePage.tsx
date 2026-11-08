import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { Avatar, Badge, Bar, Card, ErrorBox, Icon, Loading, PageHeader, StatCard } from "@/components/ui/kit";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services";
import { ageBandOf, ageOf, levelInfo, quizPassed } from "@/lib/gamification";
import { fmtDate } from "@/lib/format";

/** The learner's own page: level, stats, every badge (earned or not) and the full XP history. */
export function ProfilePage() {
  const { user } = useAuth();
  const { t, pick, lang } = useI18n();
  const u = user!;
  const { data, error, loading, reload } = useAsync(async () => {
    const [badges, progress, xp, owners] = await Promise.all([api.badges(), api.myProgress(), api.myXpEvents(), api.owners()]);
    return { badges, progress, xp, owner: owners.find((o) => o.id === u.ownerId) ?? null };
  }, [u.uid, u.xp]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "?"} onRetry={reload} />;
  const lv = levelInfo(u.xp);
  const quizzes = data.progress.filter((p) => p.quizScore !== null && p.quizTotal !== null && quizPassed(p.quizScore, p.quizTotal)).length;

  return (
    <>
      <PageHeader pretitle={t("nav.profile")} title={t("profile.title")} />
      <Card style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 18 }}>
          <Avatar name={u.displayName} color={u.avatarColor} size={72} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ margin: 0, fontSize: "var(--text-xl)" }}>{u.displayName}</h2>
            <div className="muted small">{u.email}{data.owner && <> · {t("profile.memberOf")}: {pick(data.owner.name)}</>}</div>
            <div className="row" style={{ marginTop: 8 }}>
              <Badge tone="accent">{t("app.levelN", { n: lv.level })} · {pick(lv.title)}</Badge>
              <Badge tone="warn"><Icon name="flame" size={11} />{t("app.daysN", { n: u.streakDays })}</Badge>
              <Badge tone="neutral">{t("age.band")}: {ageBandOf(u) ? `${t(`age.band.${ageBandOf(u)!}`)} · ${t("age.years", { n: ageOf(u.birthYear) ?? 0 })}` : t("age.unknown")}</Badge>
              <Badge tone={u.parentConsent.acknowledged ? "ok" : "stop"}><Icon name={u.parentConsent.acknowledged ? "checkCircle" : "alert"} size={11} />{u.parentConsent.acknowledged ? `${t("age.consent")} · ${fmtDate(u.parentConsent.at, lang)}` : t("age.consentMissing")}</Badge>
            </div>
            <div style={{ marginTop: 10, maxWidth: 420 }}>
              <div className="small muted" style={{ marginBottom: 4 }}>{u.xp} XP {lv.nextLevelXp ? `· ${t("home.toNext", { n: lv.xpToNext, lvl: lv.level + 1 })}` : `· ${t("home.maxLevel")}`}</div>
              <Bar pct={lv.pct} />
            </div>
          </div>
        </div>
      </Card>
      <div className="grid-stats" style={{ marginBottom: 16 }}>
        <StatCard icon="zap" label={t("app.xp")} value={u.xp} />
        <StatCard icon="checkCircle" label={t("profile.lessonsDone")} value={data.progress.filter((p) => p.completed).length} tone="ok" />
        <StatCard icon="checklist" label={t("profile.quizzesPassed")} value={quizzes} tone="accent" />
        <StatCard icon="trophy" label={t("profile.badges")} value={u.badgeIds.length} tone="warn" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <Card title={t("profile.badges")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
            {data.badges.map((b) => {
              const has = u.badgeIds.includes(b.id);
              return (
                <div key={b.id} className="badge-tile" data-locked={!has}>
                  <span className="ic"><Icon name={(b.icon as never) || "trophy"} size={24} /></span>
                  <b>{pick(b.name)}</b>
                  <small>{has ? pick(b.description) : t("profile.lockedBadges")}</small>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title={t("profile.history")}>
          {data.xp.length === 0 ? <div className="muted">{t("home.noXp")}</div> : (
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {data.xp.map((e) => (
                    <tr key={e.id}>
                      <td><Badge tone={e.kind === "quest" ? "accent" : e.kind === "streak" ? "warn" : "ok"}>{t(`xp.${e.kind}`)}</Badge></td>
                      <td>{e.note}</td>
                      <td className="muted small" style={{ whiteSpace: "nowrap" }}>{fmtDate(e.at, lang, true)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-accent-700)" }}>+{e.xp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
