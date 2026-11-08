import { useMemo } from "react";
import { useI18n } from "@/app/providers/I18nProvider";
import { Button, Icon, Modal } from "@/components/ui/kit";
import type { ActivityResult } from "@/services";
import type { Lesson, LessonProgress, Quest, QuestProgress, UnlockRule, UserProfile } from "@/types";
import { checkUnlock, levelFor, periodKeyFor, rulePasses } from "@/lib/gamification";
import type { IconName } from "@/constants/icons";

/** The YouTube thumbnail for a lesson card. */
export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** A lesson thumbnail: the YouTube frame, or a coloured tile when the lesson has no video yet. */
export function Thumb({ youtubeId, color, duration, locked, done }: { youtubeId: string; color?: string; duration?: number; locked?: boolean; done?: boolean }) {
  return (
    <div className="thumb" style={youtubeId ? undefined : { background: `linear-gradient(135deg, ${color ?? "var(--color-neutral-300)"}, color-mix(in srgb, ${color ?? "#888"} 55%, #182433))` }}>
      {youtubeId ? <img src={ytThumb(youtubeId)} alt="" loading="lazy" /> : <Icon name="video" size={26} color="rgba(255,255,255,0.85)" />}
      {(locked || done) && <span className="ov"><Icon name={done ? "checkCircleFill" : "lock"} size={26} /></span>}
      {!locked && !done && youtubeId && <span className="ov"><Icon name="play" size={26} /></span>}
      {duration !== undefined && <span className="dur">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}</span>}
    </div>
  );
}

/** One unlock rule in words, with its state. */
export function RuleRow({ rule, ok, lessons, quests, noAge = false }: { rule: UnlockRule; ok: boolean; lessons: Lesson[]; quests: Quest[]; noAge?: boolean }) {
  const { t, pick } = useI18n();
  const text = (() => {
    switch (rule.type) {
      case "lesson_completed": return t("rule.lesson_completed", { name: pick(lessons.find((l) => l.id === rule.lessonId)?.title) || rule.lessonId });
      case "min_level": return t("rule.min_level", { n: rule.level });
      case "min_xp": return t("rule.min_xp", { n: rule.xp });
      case "quest_completed": return t("rule.quest_completed", { name: pick(quests.find((q) => q.id === rule.questId)?.title) || rule.questId });
      case "streak_days": return t("rule.streak_days", { n: rule.days });
      case "min_age": return t("rule.min_age", { n: rule.years });
      case "age_band": return t("rule.age_band", { bands: rule.bands.map((b) => t(`age.band.${b}`)).join(", ") });
    }
  })();
  const needsAge = !ok && noAge && (rule.type === "min_age" || rule.type === "age_band");
  return (
    <div className="rule" data-ok={ok}>
      <Icon name={ok ? "checkCircleFill" : "lock"} size={16} color={ok ? "var(--tone-ok-solid)" : "var(--color-neutral-500)"} />
      <span>{text}{needsAge && <span className="small muted" style={{ display: "block" }}>{t("rule.noAge")}</span>}</span>
      <span className="st" style={{ color: ok ? "var(--tone-ok-fg)" : "var(--color-neutral-600)" }}>{t(ok ? "rule.met" : "rule.notMet")}</span>
    </div>
  );
}

/** Which rules a learner meets for one lesson. */
export function useUnlock(lesson: Lesson | undefined, user: UserProfile, progress: LessonProgress[], quests: QuestProgress[]) {
  return useMemo(() => {
    if (!lesson) return { ok: false, failing: [] as UnlockRule[], rows: [] as { rule: UnlockRule; ok: boolean }[] };
    const c = checkUnlock(lesson, user, progress, quests);
    return { ...c, rows: lesson.unlock.map((rule) => ({ rule, ok: rulePasses(rule, user, progress, quests) })) };
  }, [lesson, user, progress, quests]);
}

/** The quest progress row of the current period, or an empty one. */
export function currentQuestProgress(q: Quest, rows: QuestProgress[]): QuestProgress {
  const key = periodKeyFor(q.scope);
  return rows.find((r) => r.questId === q.id && r.periodKey === key) ?? { uid: "", questId: q.id, periodKey: key, progress: 0, completed: false, completedAt: null };
}

export const QUEST_ICON: Record<Quest["goal"]["type"], IconName> = { watch_videos: "video", pass_quizzes: "checklist", earn_xp: "zap", streak_days: "flame" };

/** The celebration after an activity: the XP, a level-up, new badges and finished quests. */
export function CheerModal({ result, onClose }: { result: ActivityResult; onClose: () => void }) {
  const { t, pick } = useI18n();
  const levelUp = result.levelAfter > result.levelBefore;
  return (
    <Modal title={t("cheer.title")} onClose={onClose} actions={<Button onClick={onClose}>{t("cheer.ok")}</Button>}>
      <div className="cheer">
        <Icon name="starFill" size={40} color="var(--tone-warn-solid)" />
        <div className="big">{t("cheer.xp", { xp: result.xpGained })}</div>
        {levelUp && <div style={{ fontWeight: 700, color: "var(--tone-ok-fg)" }}>{t("cheer.levelUp", { n: result.levelAfter })}</div>}
        {result.lessonCompleted && <div className="muted small" style={{ marginTop: 4 }}>{t("cheer.lessonDone")}</div>}
        <ul>
          {result.events.map((e, i) => <li key={i}><Icon name={e.kind === "video" ? "video" : e.kind === "quiz" ? "checklist" : e.kind === "quest" ? "rocket" : "flame"} size={14} /><span>{t(`xp.${e.kind}`)} · {e.note}</span><b>+{e.xp}</b></li>)}
          {result.questsCompleted.map((q) => <li key={q.id}><Icon name="rocket" size={14} color="var(--color-accent)" /><span>{t("cheer.quest")}: {pick(q.title)}</span></li>)}
          {result.newBadges.map((b) => <li key={b.id}><Icon name="trophy" size={14} color="var(--tone-warn-solid)" /><span>{t("cheer.badge")}: {pick(b.name)}</span></li>)}
        </ul>
      </div>
    </Modal>
  );
}

export { levelFor };
