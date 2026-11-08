using Ellp.Api.Modules.Progress;
using Ellp.Api.Shared;

namespace Ellp.Api.Tests;

/// <summary>The numbers and the rules both the demo (lib/gamification.ts) and the server promise.</summary>
public class GamificationRulesTests
{
    [Theory]
    [InlineData(0, 1)] [InlineData(99, 1)] [InlineData(100, 2)] [InlineData(249, 2)] [InlineData(250, 3)]
    [InlineData(500, 4)] [InlineData(900, 5)] [InlineData(1400, 6)] [InlineData(2000, 7)] [InlineData(2800, 8)] [InlineData(3800, 9)] [InlineData(5000, 10)] [InlineData(99999, 10)]
    public void Level_follows_the_thresholds(int xp, int level) => Assert.Equal(level, GamificationRules.LevelFor(xp));

    [Fact]
    public void Quiz_pays_ten_per_correct_and_a_perfect_bonus()
    {
        Assert.Equal(0, GamificationRules.QuizXp(0, 3));
        Assert.Equal(20, GamificationRules.QuizXp(2, 3));
        Assert.Equal(50, GamificationRules.QuizXp(3, 3));
        Assert.Equal(0, GamificationRules.QuizXp(0, 0));
    }

    [Theory]
    [InlineData(2, 3, true)] [InlineData(1, 3, false)] [InlineData(3, 5, true)] [InlineData(2, 5, false)] [InlineData(0, 0, false)]
    public void Quiz_passes_at_sixty_percent(int correct, int total, bool passed) => Assert.Equal(passed, GamificationRules.QuizPassed(correct, total));

    [Fact]
    public void Retake_pays_only_the_improvement()
    {
        Assert.Equal(50, GamificationRules.QuizGain(3, -1, 3));   // first try, perfect
        Assert.Equal(30, GamificationRules.QuizGain(3, 2, 3));    // 2/3 → 3/3: 50 - 20
        Assert.Equal(-10, GamificationRules.QuizGain(1, 2, 3));   // worse than before: negative, and the service pays nothing for a gain <= 0
        Assert.True(GamificationRules.QuizGain(1, 2, 3) <= 0);
    }

    [Theory]
    [InlineData(0, 0)] [InlineData(1, 5)] [InlineData(3, 15)] [InlineData(5, 25)] [InlineData(30, 25)]
    public void Streak_bonus_is_five_a_day_capped_at_twenty_five(int days, int xp) => Assert.Equal(xp, GamificationRules.StreakBonus(days));

    [Fact]
    public void Streak_continues_resets_or_stays()
    {
        Assert.Equal((3, true), GamificationRules.NextStreak(2, "2026-11-07", "2026-11-08"));
        Assert.Equal((1, true), GamificationRules.NextStreak(5, "2026-11-05", "2026-11-08"));
        Assert.Equal((1, true), GamificationRules.NextStreak(0, null, "2026-11-08"));
        Assert.Equal((4, false), GamificationRules.NextStreak(4, "2026-11-08", "2026-11-08"));
    }

    [Fact]
    public void Period_keys_match_the_frontend()
    {
        var d = new DateTime(2026, 11, 8, 12, 0, 0, DateTimeKind.Utc);  // a Sunday: ISO week 45
        Assert.Equal("2026-11-08", GamificationRules.PeriodKeyFor("daily", d));
        Assert.Equal("2026-W45", GamificationRules.PeriodKeyFor("weekly", d));
        Assert.Equal("all", GamificationRules.PeriodKeyFor("program", d));
    }

    private static readonly UserProfile Learner = new() { Uid = "u", Xp = 260, StreakDays = 2 };
    private static readonly List<LessonProgress> Progress = new() { new() { Uid = "u", LessonId = "a", Completed = true, WatchedPct = 100 } };
    private static readonly List<QuestProgress> Quests = new() { new() { Uid = "u", QuestId = "q1", Completed = true } };

    [Fact]
    public void Unlock_rules_each_pass_or_fail_on_their_own()
    {
        Assert.True(GamificationRules.RulePasses(new UnlockRule { Type = "lesson_completed", LessonId = "a" }, Learner, Progress, Quests));
        Assert.False(GamificationRules.RulePasses(new UnlockRule { Type = "lesson_completed", LessonId = "b" }, Learner, Progress, Quests));
        Assert.True(GamificationRules.RulePasses(new UnlockRule { Type = "min_level", Level = 3 }, Learner, Progress, Quests));
        Assert.False(GamificationRules.RulePasses(new UnlockRule { Type = "min_level", Level = 4 }, Learner, Progress, Quests));
        Assert.True(GamificationRules.RulePasses(new UnlockRule { Type = "min_xp", Xp = 260 }, Learner, Progress, Quests));
        Assert.False(GamificationRules.RulePasses(new UnlockRule { Type = "min_xp", Xp = 261 }, Learner, Progress, Quests));
        Assert.True(GamificationRules.RulePasses(new UnlockRule { Type = "quest_completed", QuestId = "q1" }, Learner, Progress, Quests));
        Assert.False(GamificationRules.RulePasses(new UnlockRule { Type = "quest_completed", QuestId = "q2" }, Learner, Progress, Quests));
        Assert.True(GamificationRules.RulePasses(new UnlockRule { Type = "streak_days", Days = 2 }, Learner, Progress, Quests));
        Assert.False(GamificationRules.RulePasses(new UnlockRule { Type = "streak_days", Days = 3 }, Learner, Progress, Quests));
        Assert.False(GamificationRules.RulePasses(new UnlockRule { Type = "unknown" }, Learner, Progress, Quests));
    }

    [Fact]
    public void A_lesson_opens_only_when_every_rule_passes()
    {
        var open = new Lesson { Unlock = new() { new() { Type = "lesson_completed", LessonId = "a" }, new() { Type = "min_level", Level = 3 } } };
        var shut = new Lesson { Unlock = new() { new() { Type = "lesson_completed", LessonId = "a" }, new() { Type = "min_level", Level = 9 } } };
        Assert.True(GamificationRules.Unlocked(open, Learner, Progress, Quests));
        Assert.False(GamificationRules.Unlocked(shut, Learner, Progress, Quests));
        Assert.True(GamificationRules.Unlocked(new Lesson(), Learner, Progress, Quests));
    }

    [Fact]
    public void A_lesson_is_complete_after_the_mark_and_a_passed_quiz()
    {
        var withQuiz = new Lesson { Quiz = new() { new(), new(), new() } };
        Assert.False(GamificationRules.LessonComplete(withQuiz, null));
        Assert.False(GamificationRules.LessonComplete(withQuiz, new LessonProgress { WatchedPct = 100 }));
        Assert.False(GamificationRules.LessonComplete(withQuiz, new LessonProgress { WatchedPct = 100, QuizScore = 1, QuizTotal = 3 }));
        Assert.True(GamificationRules.LessonComplete(withQuiz, new LessonProgress { WatchedPct = 80, QuizScore = 2, QuizTotal = 3 }));
        Assert.False(GamificationRules.LessonComplete(withQuiz, new LessonProgress { WatchedPct = 79, QuizScore = 3, QuizTotal = 3 }));
        Assert.True(GamificationRules.LessonComplete(new Lesson(), new LessonProgress { WatchedPct = 80 }));
    }
}
