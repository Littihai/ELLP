using Ellp.Api.Shared;
using Ellp.Api.Shared.Data;
using static Ellp.Api.Modules.Progress.GamificationRules;

namespace Ellp.Api.Modules.Progress;

/// <summary>What one activity earned, as the frontend's ActivityResult (services/api.ts).</summary>
public sealed class ActivityResult
{
    public LessonProgress Progress { get; set; } = new();
    public int XpGained { get; set; }
    public List<XpLine> Events { get; set; } = new();
    public int LevelBefore { get; set; }
    public int LevelAfter { get; set; }
    public List<Badge> NewBadges { get; set; } = new();
    public List<Quest> QuestsCompleted { get; set; } = new();
    public bool LessonCompleted { get; set; }
}
public sealed record XpLine(string Kind, int Xp, string Note);

public interface IProgressService
{
    Task<ActivityResult> RecordWatchAsync(UserProfile me, string lessonId, int watchedPct, CancellationToken ct);
    Task<ActivityResult> SubmitQuizAsync(UserProfile me, string lessonId, int[] answers, CancellationToken ct);
    Task<List<LeaderboardRow>> LeaderboardAsync(UserProfile me, string? programId, string period, CancellationToken ct);
}

/// <summary>
/// The gamification engine over the store, the server twin of frontend/src/services/demoStore.ts: credits XP, moves the
/// streak, advances quests, awards badges and marks lessons complete. All numbers come from GamificationRules.
/// </summary>
public sealed class ProgressService : IProgressService
{
    private readonly IEllpStore _s;
    public ProgressService(IEllpStore s) => _s = s;

    private sealed class Ctx
    {
        public required UserProfile Me;
        public required ActivityResult Out;
        public required List<Quest> Quests;
        public required List<QuestProgress> QuestRows;
        public required List<Badge> Badges;
        /// <summary>The learner's age-band rule under their tenant's settings (pass mark, streak freeze).</summary>
        public required AgeRule Age;
    }

    private async Task<Ctx> Begin(UserProfile me, LessonProgress p, CancellationToken ct)
    {
        var quests = me.OwnerId is null ? new List<Quest>() : await _s.QuestsAsync(me.OwnerId, ct);
        return new Ctx
        {
            Me = me,
            Out = new ActivityResult { Progress = p, LevelBefore = LevelFor(me.Xp), LevelAfter = LevelFor(me.Xp) },
            Quests = quests,
            QuestRows = await _s.QuestProgressAsync(me.Uid, ct),
            Badges = await _s.BadgesAsync(ct),
            Age = AgeRuleFor(me.OwnerId is null ? null : await _s.SettingsAsync(me.OwnerId, ct), me, DateTime.UtcNow),
        };
    }

    private async Task AddXp(Ctx c, string? programId, string kind, int xp, string note, CancellationToken ct)
    {
        if (xp <= 0) return;
        c.Me.Xp += xp;
        c.Out.XpGained += xp;
        c.Out.Events.Add(new XpLine(kind, xp, note));
        await _s.AddXpEventAsync(new XpEvent { Id = Clock.NewId("xe"), Uid = c.Me.Uid, OwnerId = c.Me.OwnerId ?? "", ProgramId = programId, Kind = kind, Xp = xp, Note = note, At = Clock.NowIso() }, ct);
    }

    private void GiveBadge(Ctx c, string badgeId)
    {
        if (c.Me.BadgeIds.Contains(badgeId)) return;
        var b = c.Badges.FirstOrDefault(x => x.Id == badgeId);
        if (b is null) return;
        c.Me.BadgeIds.Add(badgeId);
        c.Out.NewBadges.Add(b);
    }

    private async Task TouchDay(Ctx c, CancellationToken ct)
    {
        var today = DayKey(DateTime.UtcNow);
        var (streak, first) = NextStreak(c.Me.StreakDays, c.Me.LastActiveDate, today, c.Age.StreakFreeze);
        if (!first) return;
        c.Me.StreakDays = streak;
        c.Me.LastActiveDate = today;
        await AddXp(c, null, "streak", StreakBonus(streak), $"Day {streak}", ct);
        await AdvanceQuests(c, "streak_days", streak, absolute: true, null, ct);
    }

    private async Task AdvanceQuests(Ctx c, string goal, int amount, bool absolute, string? programId, CancellationToken ct)
    {
        foreach (var q in c.Quests.Where(q => q.Active && q.Goal.Type == goal && (q.ProgramId is null || q.ProgramId == programId)))
        {
            var period = PeriodKeyFor(q.Scope, DateTime.UtcNow);
            var qp = c.QuestRows.FirstOrDefault(x => x.QuestId == q.Id && x.PeriodKey == period);
            if (qp is null) { qp = new QuestProgress { Uid = c.Me.Uid, QuestId = q.Id, PeriodKey = period }; c.QuestRows.Add(qp); }
            if (qp.Completed) continue;
            qp.Progress = absolute ? Math.Max(qp.Progress, amount) : qp.Progress + amount;
            if (qp.Progress >= q.Goal.Target)
            {
                qp.Completed = true; qp.CompletedAt = Clock.NowIso();
                c.Out.QuestsCompleted.Add(q);
                await AddXp(c, q.ProgramId, "quest", q.XpReward, q.Title.En, ct);
                if (q.BadgeId is not null) GiveBadge(c, q.BadgeId);
            }
            await _s.UpsertQuestProgressAsync(qp, ct);
        }
    }

    private void FinishIfDue(Ctx c, Lesson lesson, LessonProgress p)
    {
        if (p.Completed || !LessonComplete(lesson, p, c.Age.QuizPassPct)) return;
        p.Completed = true; p.CompletedAt = Clock.NowIso();
        c.Out.LessonCompleted = true;
        GiveBadge(c, "bdg_first");
    }

    private async Task<LessonProgress> ProgressOf(string uid, string lessonId, CancellationToken ct)
        => (await _s.ProgressAsync(uid, ct)).FirstOrDefault(p => p.LessonId == lessonId) ?? new LessonProgress { Uid = uid, LessonId = lessonId, UpdatedAt = Clock.NowIso() };

    private async Task End(Ctx c, LessonProgress p, CancellationToken ct)
    {
        c.Out.LevelAfter = LevelFor(c.Me.Xp);
        c.Out.Progress = p;
        await _s.UpsertProgressAsync(p, ct);
        await _s.UpsertUserAsync(c.Me, ct);
    }

    public async Task<ActivityResult> RecordWatchAsync(UserProfile me, string lessonId, int watchedPct, CancellationToken ct)
    {
        var lesson = await _s.LessonAsync(lessonId, ct) ?? throw new KeyNotFoundException("LESSON_NOT_FOUND");
        var progress = await _s.ProgressAsync(me.Uid, ct);
        var quests = await _s.QuestProgressAsync(me.Uid, ct);
        if (!Unlocked(lesson, me, progress, quests)) throw new InvalidOperationException("LESSON_LOCKED");
        var p = progress.FirstOrDefault(x => x.LessonId == lessonId) ?? new LessonProgress { Uid = me.Uid, LessonId = lessonId };
        var c = await Begin(me, p, ct);
        var before = p.WatchedPct;
        p.WatchedPct = Math.Max(p.WatchedPct, Math.Clamp(watchedPct, 0, 100));
        p.UpdatedAt = Clock.NowIso();
        if (before < WatchCompletePct && p.WatchedPct >= WatchCompletePct)
        {
            await TouchDay(c, ct);
            await AddXp(c, lesson.ProgramId, "video", lesson.XpReward, lesson.Title.En, ct);
            await AdvanceQuests(c, "watch_videos", 1, false, lesson.ProgramId, ct);
            await AdvanceQuests(c, "earn_xp", c.Out.XpGained, false, lesson.ProgramId, ct);
            FinishIfDue(c, lesson, p);
        }
        await End(c, p, ct);
        return c.Out;
    }

    public async Task<ActivityResult> SubmitQuizAsync(UserProfile me, string lessonId, int[] answers, CancellationToken ct)
    {
        var lesson = await _s.LessonAsync(lessonId, ct) ?? throw new KeyNotFoundException("LESSON_NOT_FOUND");
        var p = await ProgressOf(me.Uid, lessonId, ct);
        if (p.WatchedPct < WatchCompletePct) throw new InvalidOperationException("WATCH_FIRST");
        var c = await Begin(me, p, ct);
        var total = lesson.Quiz.Count;
        var correct = lesson.Quiz.Select((q, i) => i < answers.Length && answers[i] == q.Answer ? 1 : 0).Sum();
        var bestBefore = p.QuizScore ?? -1;
        p.QuizTotal = total;
        p.QuizScore = Math.Max(bestBefore, correct);
        p.UpdatedAt = Clock.NowIso();
        await TouchDay(c, ct);
        var gain = QuizGain(correct, bestBefore, total);
        if (gain > 0) await AddXp(c, lesson.ProgramId, "quiz", gain, $"{lesson.Title.En} quiz {correct}/{total}", ct);
        var passedBefore = bestBefore >= 0 && QuizPassed(bestBefore, total, c.Age.QuizPassPct);
        if (QuizPassed(correct, total, c.Age.QuizPassPct) && !passedBefore) await AdvanceQuests(c, "pass_quizzes", 1, false, lesson.ProgramId, ct);
        if (gain > 0) await AdvanceQuests(c, "earn_xp", gain, false, lesson.ProgramId, ct);
        if (lesson.Id == "les_babyshark" && correct == total) GiveBadge(c, "bdg_shark");
        FinishIfDue(c, lesson, p);
        await End(c, p, ct);
        return c.Out;
    }

    public async Task<List<LeaderboardRow>> LeaderboardAsync(UserProfile me, string? programId, string period, CancellationToken ct)
    {
        var learners = (await _s.UsersAsync(me.OwnerId, ct)).Where(u => u.Role == Role.learner && u.Active).ToList();
        var size = (await _s.SettingsAsync(me.OwnerId ?? "", ct)).Leaderboard.Size;
        var wk = WeekKey(DateTime.UtcNow);
        List<XpEvent>? events = null;
        if (period == "week" || programId is not null) events = await _s.XpEventsAsync(null, me.OwnerId, ct);
        int Score(UserProfile u) => events is null ? u.Xp : events
            .Where(e => e.Uid == u.Uid && (programId is null || e.ProgramId == programId || e.ProgramId is null) && (period != "week" || WeekKey(DateTime.Parse(e.At, null, System.Globalization.DateTimeStyles.RoundtripKind)) == wk))
            .Sum(e => e.Xp);
        return learners.Select(u => (u, xp: Score(u)))
            .OrderByDescending(x => x.xp).ThenBy(x => x.u.DisplayName)
            .Take(size)
            .Select((x, i) => new LeaderboardRow(i + 1, x.u.Uid, x.u.DisplayName, x.u.AvatarColor, x.xp, LevelFor(x.u.Xp), x.u.Uid == me.Uid))
            .ToList();
    }
}
