using System.Globalization;
using Ellp.Api.Shared;

namespace Ellp.Api.Modules.Progress;

/// <summary>
/// The gamification rules as pure static functions: the same numbers and the same behaviour as
/// frontend/src/lib/gamification.ts, so the demo and the server agree. Tested in Ellp.Api.Tests/GamificationRulesTests.cs.
/// </summary>
public static class GamificationRules
{
    public const int WatchCompletePct = 80;
    public const int XpPerCorrect = 10;
    public const int XpPerfectBonus = 20;
    public const int XpStreakPerDay = 5;
    public const int XpStreakCap = 25;
    public const int QuizPassPct = 60;

    /// <summary>Level thresholds in total XP; level 1 is 0.</summary>
    public static readonly int[] LevelXp = { 0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000 };

    public static int LevelFor(int xp)
    {
        var lvl = 1;
        for (var i = 0; i < LevelXp.Length; i++) if (xp >= LevelXp[i]) lvl = i + 1;
        return lvl;
    }

    public static int QuizXp(int correct, int total) => total <= 0 ? 0 : correct * XpPerCorrect + (correct == total ? XpPerfectBonus : 0);

    public static bool QuizPassed(int correct, int total) => total > 0 && correct * 100.0 / total >= QuizPassPct;

    public static int StreakBonus(int streakDays) => Math.Min(XpStreakCap, Math.Max(0, streakDays) * XpStreakPerDay);

    public static string DayKey(DateTime d) => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    public static string WeekKey(DateTime d)
    {
        var week = ISOWeek.GetWeekOfYear(d);
        var year = ISOWeek.GetYear(d);
        return $"{year}-W{week:00}";
    }

    public static string PeriodKeyFor(string scope, DateTime d) => scope switch
    {
        "daily" => DayKey(d),
        "weekly" => WeekKey(d),
        _ => "all",
    };

    /// <summary>The streak after an activity on <paramref name="today"/>: +1 when yesterday was active, 1 when the chain broke, unchanged when today was already counted.</summary>
    public static (int StreakDays, bool FirstToday) NextStreak(int streakDays, string? lastActiveDate, string today)
    {
        if (lastActiveDate == today) return (streakDays, false);
        var t = DateTime.ParseExact(today, "yyyy-MM-dd", CultureInfo.InvariantCulture);
        var yesterday = DayKey(t.AddDays(-1));
        return (lastActiveDate == yesterday ? streakDays + 1 : 1, true);
    }

    public static bool RulePasses(UnlockRule r, UserProfile user, IReadOnlyCollection<LessonProgress> progress, IReadOnlyCollection<QuestProgress> quests) => r.Type switch
    {
        "lesson_completed" => progress.Any(p => p.LessonId == r.LessonId && p.Completed),
        "min_level" => LevelFor(user.Xp) >= (r.Level ?? int.MaxValue),
        "min_xp" => user.Xp >= (r.Xp ?? int.MaxValue),
        "quest_completed" => quests.Any(q => q.QuestId == r.QuestId && q.Completed),
        "streak_days" => user.StreakDays >= (r.Days ?? int.MaxValue),
        _ => false,
    };

    /// <summary>Every rule must pass; a lesson without rules is open.</summary>
    public static bool Unlocked(Lesson lesson, UserProfile user, IReadOnlyCollection<LessonProgress> progress, IReadOnlyCollection<QuestProgress> quests)
        => lesson.Unlock.All(r => RulePasses(r, user, progress, quests));

    /// <summary>Complete when the video reached the mark and the quiz (if any) was passed.</summary>
    public static bool LessonComplete(Lesson lesson, LessonProgress? p)
    {
        if (p is null) return false;
        var watched = p.WatchedPct >= WatchCompletePct;
        if (lesson.Quiz.Count == 0) return watched;
        return watched && p.QuizScore is int s && p.QuizTotal is int t && QuizPassed(s, t);
    }

    /// <summary>A quiz pays for the improvement over the best score so far, so a retake cannot farm points.</summary>
    public static int QuizGain(int correct, int bestBefore, int total) => QuizXp(correct, total) - (bestBefore >= 0 ? QuizXp(bestBefore, total) : 0);
}
