using Ellp.Api.Modules.Family;
using Ellp.Api.Shared;

namespace Ellp.Api.Tests;

/// <summary>Skill profile, parent access and the weekly report (decision 0008), the twin of frontend/src/lib/skills.ts and lib/family.ts.</summary>
public class FamilyRulesTests
{
    private static Lesson L(string id, int duration, params string[] skills) => new() { Id = id, Published = true, DurationSec = duration, Skills = skills.ToList() };
    private static LessonProgress P(string lesson, bool done, int? score, int? total, string updated, string? completed = null, double watched = 0) =>
        new() { Uid = "kid", LessonId = lesson, Completed = done, QuizScore = score, QuizTotal = total, UpdatedAt = updated, CompletedAt = completed, WatchedSec = watched };

    private static readonly List<Lesson> Lessons = new() { L("l1", 120, "listening", "vocabulary"), L("l2", 180, "listening"), L("l3", 600, "grammar"), new() { Id = "draft", Published = false, Skills = new() { "writing" } } };

    [Fact]
    public void Skill_profile_counts_lessons_and_quiz_accuracy_per_skill()
    {
        var progress = new List<LessonProgress> { P("l1", true, 3, 3, "2026-11-05T10:00:00.000Z", "2026-11-05T10:00:00.000Z"), P("l2", false, 1, 2, "2026-11-06T10:00:00.000Z") };
        var rows = FamilyRules.SkillProfile(Lessons, progress);
        var listening = rows.Single(r => r.Skill == "listening");
        Assert.Equal((1, 2, 50, 4, 5, 80), (listening.LessonsDone, listening.LessonsTotal, listening.Pct, listening.QuizCorrect, listening.QuizTotal, listening.Accuracy));
        var grammar = rows.Single(r => r.Skill == "grammar");
        Assert.Equal((0, 1, 0), (grammar.LessonsDone, grammar.LessonsTotal, grammar.Pct));
        Assert.Null(grammar.Accuracy);
        Assert.Equal(0, rows.Single(r => r.Skill == "writing").LessonsTotal);   // the draft lesson does not count
        Assert.Equal(("vocabulary", "grammar"), FamilyRules.StrongestWeakest(rows));
    }

    [Fact]
    public void One_skill_alone_has_no_weakest()
    {
        var rows = FamilyRules.SkillProfile(new List<Lesson> { L("x", 60, "reading") }, new List<LessonProgress>());
        Assert.Equal(("reading", null), FamilyRules.StrongestWeakest(rows));
        Assert.Equal((null, null), FamilyRules.StrongestWeakest(new List<SkillProfileRow>()));
    }

    [Fact]
    public void Parents_read_their_own_children_of_their_own_tenant_only()
    {
        var parent = new UserProfile { Uid = "p", Role = Role.parent, OwnerId = "own_a", ChildUids = new() { "kid", "other" } };
        Assert.True(FamilyRules.CanViewChild(parent, new UserProfile { Uid = "kid", Role = Role.learner, OwnerId = "own_a" }));
        Assert.False(FamilyRules.CanViewChild(parent, new UserProfile { Uid = "stranger", Role = Role.learner, OwnerId = "own_a" }));
        Assert.False(FamilyRules.CanViewChild(parent, new UserProfile { Uid = "other", Role = Role.learner, OwnerId = "own_b" }));
        Assert.False(FamilyRules.CanViewChild(parent, new UserProfile { Uid = "kid", Role = Role.admin, OwnerId = "own_a" }));
        Assert.False(FamilyRules.CanViewChild(new UserProfile { Uid = "l", Role = Role.learner, OwnerId = "own_a", ChildUids = new() { "kid" } }, new UserProfile { Uid = "kid", Role = Role.learner, OwnerId = "own_a" }));
    }

    [Fact]
    public void Week_ranges_follow_the_iso_calendar()
    {
        Assert.Equal(("2026-11-02", "2026-11-08"), FamilyRules.WeekRange("2026-W45"));
        Assert.Equal(("2025-12-29", "2026-01-04"), FamilyRules.WeekRange("2026-W01"));
        Assert.Equal(("garbage", "garbage"), FamilyRules.WeekRange("garbage"));
        var weeks = FamilyRules.RecentWeeks(2, new DateTime(2026, 11, 8, 12, 0, 0, DateTimeKind.Utc));
        Assert.Equal(new[] { "2026-W45", "2026-W44", "2026-W43" }, weeks);
    }

    [Fact]
    public void The_weekly_report_adds_up_the_week_only()
    {
        var child = new UserProfile { Uid = "kid", DisplayName = "น้องมิ้นท์", Xp = 130, StreakDays = 3 };
        var progress = new List<LessonProgress>
        {
            P("l1", true, 3, 3, "2026-11-05T10:00:00.000Z", "2026-11-05T10:00:00.000Z"),          // finished this week: full length counts
            P("l2", false, null, null, "2026-11-07T10:00:00.000Z", watched: 74),                  // in progress this week: the seconds played
            P("l3", true, 1, 1, "2026-10-01T10:00:00.000Z", "2026-10-01T10:00:00.000Z"),          // long ago: not this week
        };
        var events = new List<XpEvent>
        {
            new() { Uid = "kid", Xp = 50, At = "2026-11-05T10:00:00.000Z" }, new() { Uid = "kid", Xp = 20, At = "2026-11-05T12:00:00.000Z" },
            new() { Uid = "kid", Xp = 10, At = "2026-11-07T10:00:00.000Z" }, new() { Uid = "kid", Xp = 999, At = "2026-10-01T10:00:00.000Z" }, new() { Uid = "someone", Xp = 5, At = "2026-11-06T10:00:00.000Z" },
        };
        var r = FamilyRules.BuildWeeklyReport(child, Lessons, progress, events, "2026-W45");
        Assert.Equal((80, 1, 1, 2, 3), (r.Xp, r.LessonsDone, r.QuizzesPassed, r.ActiveDays, r.Minutes));   // (120 + 74) s ≈ 3 min
        Assert.Equal(("2026-11-02", "2026-11-08", 2, 3), (r.From, r.To, r.Level, r.StreakDays));
        Assert.Equal(("grammar", "listening"), (r.Strongest, r.Weakest));   // grammar and vocabulary tie; the canonical order decides
        Assert.Contains("เข้าเรียน 2 วัน", r.Summary.Th);
        Assert.Contains("3-day streak", r.Summary.En);
        Assert.Equal("สัปดาห์นี้ น้องมิ้นท์ เข้าเรียน 2 วัน รวมประมาณ 3 นาที จบ 1 บท และได้ 80 XP ทำได้ดีที่สุดด้านไวยากรณ์ ส่วนที่ควรฝึกเพิ่มคือการฟัง เรียนต่อเนื่อง 3 วันแล้ว เยี่ยมมาก", r.Summary.Th);
    }

    [Fact]
    public void A_quiet_week_gets_the_gentle_sentence()
    {
        var r = FamilyRules.BuildWeeklyReport(new UserProfile { Uid = "kid", DisplayName = "Pim" }, Lessons, new(), new(), "2026-W45");
        Assert.Equal(0, r.Xp);
        Assert.Equal("Pim did not learn this week. A short video together is an easy restart.", r.Summary.En);
    }
}
