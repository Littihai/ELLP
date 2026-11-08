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

    public static bool QuizPassed(int correct, int total, int passPct = QuizPassPct) => total > 0 && correct * 100.0 / total >= passPct;

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

    /// <summary>
    /// The streak after an activity on <paramref name="today"/>: +1 when yesterday was active, unchanged when today was already counted.
    /// A broken chain resets to 1, unless the learner's age band has <paramref name="freeze"/>: then it carries on (+1) as if no day was missed.
    /// </summary>
    public static (int StreakDays, bool FirstToday) NextStreak(int streakDays, string? lastActiveDate, string today, bool freeze = false)
    {
        if (lastActiveDate == today) return (streakDays, false);
        var t = DateTime.ParseExact(today, "yyyy-MM-dd", CultureInfo.InvariantCulture);
        var yesterday = DayKey(t.AddDays(-1));
        if (lastActiveDate == yesterday) return (streakDays + 1, true);
        return (freeze && lastActiveDate is not null ? streakDays + 1 : 1, true);
    }

    // ── age (decision 0004) ──

    public static readonly string[] AgeBands = { "3-5", "6-8", "9-12", "13-15", "16-18", "18+" };

    /// <summary>Age in whole years from the birth year alone.</summary>
    public static int? AgeOf(int? birthYear, DateTime now) => birthYear is int y && y >= 1900 ? Math.Max(0, now.Year - y) : null;

    public static string? AgeBandFor(int? age) => age switch { null => null, <= 5 => "3-5", <= 8 => "6-8", <= 12 => "9-12", <= 15 => "13-15", <= 18 => "16-18", _ => "18+" };

    public static string? AgeBandOf(UserProfile u, DateTime now) => AgeBandFor(AgeOf(u.BirthYear, now));

    /// <summary>The defaults a tenant starts with: gentler for the youngest, the standard rules from 9 up.</summary>
    public static readonly IReadOnlyDictionary<string, AgeRule> DefaultAgeRules = new Dictionary<string, AgeRule>
    {
        ["3-5"] = new() { QuizPassPct = 50, LeaderboardVisible = false, StreakFreeze = true },
        ["6-8"] = new() { QuizPassPct = 60, LeaderboardVisible = true, StreakFreeze = true },
        ["9-12"] = new() { QuizPassPct = 70, LeaderboardVisible = true, StreakFreeze = false },
        ["13-15"] = new() { QuizPassPct = 70, LeaderboardVisible = true, StreakFreeze = false },
        ["16-18"] = new() { QuizPassPct = 70, LeaderboardVisible = true, StreakFreeze = false },
        ["18+"] = new() { QuizPassPct = 70, LeaderboardVisible = true, StreakFreeze = false },
    };
    /// <summary>An unknown age gets the standard numbers.</summary>
    public static readonly AgeRule BaseAgeRule = new() { QuizPassPct = QuizPassPct, LeaderboardVisible = true, StreakFreeze = false };

    public static AgeRule AgeRuleFor(OwnerSettings? settings, UserProfile u, DateTime now)
    {
        var band = AgeBandOf(u, now);
        if (band is null) return BaseAgeRule;
        if (settings?.AgeRules is not null && settings.AgeRules.TryGetValue(band, out var r)) return r;
        return DefaultAgeRules[band];
    }

    /// <summary>The override opens everything; no bands = every age; an unknown age is not held against the learner; otherwise the band must be listed.</summary>
    public static bool ProgramVisible(LearningProgram p, UserProfile u, DateTime now)
    {
        if (u.AllowAllAges || p.AgeBands.Count == 0) return true;
        var band = AgeBandOf(u, now);
        return band is null || p.AgeBands.Contains(band);
    }

    public static bool RulePasses(UnlockRule r, UserProfile user, IReadOnlyCollection<LessonProgress> progress, IReadOnlyCollection<QuestProgress> quests, DateTime? now = null) => r.Type switch
    {
        "lesson_completed" => progress.Any(p => p.LessonId == r.LessonId && p.Completed),
        "min_level" => LevelFor(user.Xp) >= (r.Level ?? int.MaxValue),
        "min_xp" => user.Xp >= (r.Xp ?? int.MaxValue),
        "quest_completed" => quests.Any(q => q.QuestId == r.QuestId && q.Completed),
        "streak_days" => user.StreakDays >= (r.Days ?? int.MaxValue),
        // the age rules: the override opens them; an unknown age fails them (a teacher adds the birth year on the Members page)
        "min_age" => user.AllowAllAges || (AgeOf(user.BirthYear, now ?? DateTime.UtcNow) is int a && a >= (r.Years ?? int.MaxValue)),
        "age_band" => user.AllowAllAges || (AgeBandOf(user, now ?? DateTime.UtcNow) is string b && (r.Bands ?? new List<string>()).Contains(b)),
        _ => false,
    };

    /// <summary>Every rule must pass; a lesson without rules is open.</summary>
    public static bool Unlocked(Lesson lesson, UserProfile user, IReadOnlyCollection<LessonProgress> progress, IReadOnlyCollection<QuestProgress> quests, DateTime? now = null)
        => lesson.Unlock.All(r => RulePasses(r, user, progress, quests, now));

    /// <summary>Complete when the video reached the mark and the quiz (if any) was passed at the learner's pass mark.</summary>
    public static bool LessonComplete(Lesson lesson, LessonProgress? p, int passPct = QuizPassPct)
    {
        if (p is null) return false;
        var watched = p.WatchedPct >= WatchCompletePct;
        if (lesson.Quiz.Count == 0) return watched;
        return watched && p.QuizScore is int s && p.QuizTotal is int t && QuizPassed(s, t, passPct);
    }

    /// <summary>A quiz pays for the improvement over the best score so far, so a retake cannot farm points.</summary>
    public static int QuizGain(int correct, int bestBefore, int total) => QuizXp(correct, total) - (bestBefore >= 0 ? QuizXp(bestBefore, total) : 0);
}
