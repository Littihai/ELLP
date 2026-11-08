using Ellp.Api.Modules.Progress;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Data;

namespace Ellp.Api.Tests;

/// <summary>Age bands, the two age unlock rules, program visibility and the per-band defaults (decision 0004).</summary>
public class AgeRulesTests
{
    private static readonly DateTime Now = new(2026, 11, 8, 12, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData(2023, 3, "3-5")] [InlineData(2021, 5, "3-5")] [InlineData(2020, 6, "6-8")] [InlineData(2018, 8, "6-8")]
    [InlineData(2017, 9, "9-12")] [InlineData(2014, 12, "9-12")] [InlineData(2013, 13, "13-15")] [InlineData(2009, 17, "16-18")] [InlineData(2000, 26, "18+")]
    public void Birth_year_gives_age_and_band(int birthYear, int age, string band)
    {
        Assert.Equal(age, GamificationRules.AgeOf(birthYear, Now));
        Assert.Equal(band, GamificationRules.AgeBandFor(age));
    }

    [Fact]
    public void No_birth_year_means_no_band_and_the_standard_rule()
    {
        Assert.Null(GamificationRules.AgeOf(null, Now));
        Assert.Null(GamificationRules.AgeBandFor(null));
        var rule = GamificationRules.AgeRuleFor(new OwnerSettings(), new UserProfile(), Now);
        Assert.Equal(60, rule.QuizPassPct);
        Assert.True(rule.LeaderboardVisible);
        Assert.False(rule.StreakFreeze);
    }

    [Fact]
    public void Defaults_are_gentler_for_the_youngest_and_a_tenant_may_override()
    {
        var little = new UserProfile { BirthYear = 2022 };
        var def = GamificationRules.AgeRuleFor(new OwnerSettings(), little, Now);
        Assert.Equal(50, def.QuizPassPct);
        Assert.False(def.LeaderboardVisible);
        Assert.True(def.StreakFreeze);

        var custom = new OwnerSettings { AgeRules = { ["3-5"] = new AgeRule { QuizPassPct = 40, LeaderboardVisible = true, StreakFreeze = false } } };
        Assert.Equal(40, GamificationRules.AgeRuleFor(custom, little, Now).QuizPassPct);
        // a band the tenant did not set still falls back to the default
        Assert.Equal(70, GamificationRules.AgeRuleFor(custom, new UserProfile { BirthYear = 2016 }, Now).QuizPassPct);
    }

    [Fact]
    public void Min_age_and_age_band_rules()
    {
        var none = Array.Empty<LessonProgress>(); var noq = Array.Empty<QuestProgress>();
        var five = new UserProfile { BirthYear = 2021 };
        var seven = new UserProfile { BirthYear = 2019 };
        var unknown = new UserProfile();
        var opened = new UserProfile { AllowAllAges = true };
        var minSix = new UnlockRule { Type = "min_age", Years = 6 };
        var lowerPrimary = new UnlockRule { Type = "age_band", Bands = new() { "6-8" } };

        Assert.False(GamificationRules.RulePasses(minSix, five, none, noq, Now));
        Assert.True(GamificationRules.RulePasses(minSix, seven, none, noq, Now));
        Assert.False(GamificationRules.RulePasses(minSix, unknown, none, noq, Now));   // no age: cannot be checked, so not open
        Assert.True(GamificationRules.RulePasses(minSix, opened, none, noq, Now));     // the override opens it

        Assert.False(GamificationRules.RulePasses(lowerPrimary, five, none, noq, Now));
        Assert.True(GamificationRules.RulePasses(lowerPrimary, seven, none, noq, Now));
        Assert.False(GamificationRules.RulePasses(lowerPrimary, unknown, none, noq, Now));
        Assert.True(GamificationRules.RulePasses(lowerPrimary, opened, none, noq, Now));
    }

    [Fact]
    public void Program_visibility_follows_the_bands_with_an_override()
    {
        var body = new LearningProgram { AgeBands = new() { "6-8", "9-12" } };
        var all = new LearningProgram();
        Assert.False(GamificationRules.ProgramVisible(body, new UserProfile { BirthYear = 2022 }, Now));
        Assert.True(GamificationRules.ProgramVisible(body, new UserProfile { BirthYear = 2019 }, Now));
        Assert.True(GamificationRules.ProgramVisible(body, new UserProfile(), Now));                    // unknown age is not held against the learner
        Assert.True(GamificationRules.ProgramVisible(body, new UserProfile { BirthYear = 2022, AllowAllAges = true }, Now));
        Assert.True(GamificationRules.ProgramVisible(all, new UserProfile { BirthYear = 2022 }, Now));
    }

    [Fact]
    public void Streak_forgiveness_keeps_the_chain_going()
    {
        Assert.Equal((1, true), GamificationRules.NextStreak(5, "2026-11-05", "2026-11-08", freeze: false));
        Assert.Equal((6, true), GamificationRules.NextStreak(5, "2026-11-05", "2026-11-08", freeze: true));
        Assert.Equal((1, true), GamificationRules.NextStreak(0, null, "2026-11-08", freeze: true));   // the first day ever is still day 1
        Assert.Equal((6, true), GamificationRules.NextStreak(5, "2026-11-07", "2026-11-08", freeze: true));
    }

    [Fact]
    public void Pass_mark_follows_the_band()
    {
        Assert.True(GamificationRules.QuizPassed(1, 2, 50));
        Assert.False(GamificationRules.QuizPassed(1, 2, 60));
        var quiz3 = new Lesson { Quiz = new() { new(), new(), new() } };
        var p = new LessonProgress { WatchedPct = 100, QuizScore = 2, QuizTotal = 3 };   // 66 %
        Assert.True(GamificationRules.LessonComplete(quiz3, p, 60));
        Assert.False(GamificationRules.LessonComplete(quiz3, p, 70));
    }

    [Fact]
    public async Task A_kindergarten_learner_passes_at_fifty_percent_and_keeps_the_streak()
    {
        var store = new InMemoryStore();
        var svc = new ProgressService(store);
        var pukkie = (await store.UserAsync("u_pukkie", default))!;         // born 2022: band 3-5
        pukkie.StreakDays = 3; pukkie.LastActiveDate = "2020-01-01";          // a long-broken chain
        await svc.RecordWatchAsync(pukkie, "les_babyshark", 100, default);
        Assert.Equal(4, pukkie.StreakDays);                                    // forgiven, not reset
        var r = await svc.SubmitQuizAsync(pukkie, "les_babyshark", new[] { 1, 0, 0 }, default);   // 2/3 = 66 % ≥ 50 %
        Assert.True(r.LessonCompleted);
    }

    [Fact]
    public async Task Phonics_is_locked_for_a_four_year_old_until_a_teacher_opens_it()
    {
        var store = new InMemoryStore();
        var svc = new ProgressService(store);
        var kid = new UserProfile { Uid = "u_four", DisplayName = "Four", Email = "four@example.com", Role = Role.learner, OwnerId = "own_bright", EnrolledProgramIds = new() { "prg_phonics" }, BirthYear = 2022, CreatedAt = Clock.NowIso() };
        await store.UpsertUserAsync(kid, default);
        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.RecordWatchAsync(kid, "les_phonicsA", 100, default));
        kid.AllowAllAges = true;
        var r = await svc.RecordWatchAsync(kid, "les_phonicsA", 100, default);
        Assert.Contains(r.Events, e => e.Kind == "video");
    }
}
