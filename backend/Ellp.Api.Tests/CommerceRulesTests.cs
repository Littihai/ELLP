using Ellp.Api.Modules.Commerce;
using Ellp.Api.Shared;

namespace Ellp.Api.Tests;

/// <summary>Prices, expiry, receipts, certificates and mock scoring (decision 0007).</summary>
public class CommerceRulesTests
{
    private static readonly DateTime Now = new(2026, 11, 8, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Prices_come_from_the_tenant()
    {
        var p = new Pricing { Pro = 990, Premium = 1990 };
        Assert.Equal(990, CommerceRules.PriceFor(p, "pro"));
        Assert.Equal(1990, CommerceRules.PriceFor(p, "premium"));
        Assert.Equal(0, CommerceRules.PriceFor(p, "free"));
    }

    [Fact]
    public void A_renewal_adds_on_to_a_plan_that_still_runs()
    {
        Assert.Equal("2026-12-08T12:00:00.000Z", CommerceRules.PlanExpiry(Now, 1, null));
        Assert.Equal("2026-12-08T12:00:00.000Z", CommerceRules.PlanExpiry(Now, 1, "2026-10-01T00:00:00.000Z"));   // the old one ended: from now
        Assert.Equal("2027-01-20T00:00:00.000Z", CommerceRules.PlanExpiry(Now, 1, "2026-12-20T00:00:00.000Z"));   // still running: from its end
        Assert.Equal("2027-02-08T12:00:00.000Z", CommerceRules.PlanExpiry(Now, 3, null));
    }

    [Theory]
    [InlineData(null, "none")] [InlineData("2026-11-01T00:00:00.000Z", "expired")] [InlineData("2026-11-12T00:00:00.000Z", "expiring")] [InlineData("2026-12-20T00:00:00.000Z", "active")] [InlineData("garbage", "none")]
    public void Expiry_status(string? at, string expected) => Assert.Equal(expected, CommerceRules.ExpiryStatus(at, Now));

    [Fact]
    public void A_paid_plan_past_its_end_is_expired_once()
    {
        var u = new UserProfile { Role = Role.learner, Plan = "pro", PlanStatus = "active", PlanExpiresAt = "2026-11-01T00:00:00.000Z" };
        Assert.True(CommerceRules.ExpireIfDue(u, Now));
        Assert.Equal("expired", u.PlanStatus);
        Assert.False(CommerceRules.ExpireIfDue(u, Now));
        Assert.False(CommerceRules.ExpireIfDue(new UserProfile { Role = Role.learner, Plan = "free", PlanStatus = "active" }, Now));
    }

    [Fact]
    public void Receipts_and_codes()
    {
        Assert.Equal("EPA-2026-0007", CommerceRules.ReceiptNo("EPA", 2026, 7));
        var code = CommerceRules.CertificateCode();
        Assert.Matches("^ELLP-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$", code);
        Assert.NotEqual(code, CommerceRules.CertificateCode());
    }

    [Fact]
    public void Paying_and_refunding_change_the_learner()
    {
        var u = new UserProfile { Role = Role.learner, Track = "toeic", Plan = "pro", PlanStatus = "pending" };
        var pay = new Payment { Plan = "pro", PlanTrack = "toeic", Months = 1 };
        CommerceRules.ApplyPaid(u, pay, Now);
        Assert.Equal(("pro", "active", "toeic", "2026-12-08T12:00:00.000Z"), (u.Plan, u.PlanStatus, u.PlanTrack, u.PlanExpiresAt));
        CommerceRules.ApplyRefund(u, pay);
        Assert.Equal(("free", "active"), (u.Plan, u.PlanStatus));
        Assert.Null(u.PlanExpiresAt);
        CommerceRules.ApplyRefund(u, new Payment { Plan = "premium" });   // not the plan held: nothing happens
        Assert.Equal("free", u.Plan);
    }

    [Fact]
    public void A_program_is_complete_when_every_published_lesson_is()
    {
        var lessons = new List<Lesson> { new() { Id = "a", Published = true }, new() { Id = "b", Published = true }, new() { Id = "c", Published = false } };
        Assert.False(CommerceRules.ProgramComplete(lessons, new[] { new LessonProgress { LessonId = "a", Completed = true } }));
        Assert.True(CommerceRules.ProgramComplete(lessons, new[] { new LessonProgress { LessonId = "a", Completed = true }, new LessonProgress { LessonId = "b", Completed = true } }));
        Assert.False(CommerceRules.ProgramComplete(new List<Lesson>(), Array.Empty<LessonProgress>()));
    }

    private static MockTest Test(string scoring, double pass) => new()
    {
        Scoring = scoring, PassMark = pass,
        Sections = new() { new() { Id = "s1", Questions = new() { new() { Id = "q1", Answer = 0 }, new() { Id = "q2", Answer = 1 } } }, new() { Id = "s2", Questions = new() { new() { Id = "q3", Answer = 2 }, new() { Id = "q4", Answer = 0 } } } },
    };

    [Fact]
    public void Mock_scoring_in_three_scales()
    {
        var all = new Dictionary<string, int> { ["q1"] = 0, ["q2"] = 1, ["q3"] = 2, ["q4"] = 0 };
        var half = new Dictionary<string, int> { ["q1"] = 0, ["q2"] = 1, ["q3"] = 0 };
        var toeic = MockScoringRules.Score(Test("toeic", 600), all);
        Assert.Equal((4, 4, 990.0, true), (toeic.Raw, toeic.Total, toeic.Scaled, toeic.Passed));
        Assert.Equal("990 / 990", toeic.ScaledLabel);
        var toeicHalf = MockScoringRules.Score(Test("toeic", 600), half);
        Assert.Equal(500, toeicHalf.Scaled);                                   // 10 + 0.5 × 980 = 500
        Assert.False(toeicHalf.Passed);
        Assert.Equal(new[] { 2, 0 }, toeicHalf.Sections.Select(s => s.Raw));
        var ielts = MockScoringRules.Score(Test("ielts", 6.5), half);
        Assert.Equal(4.5, ielts.Scaled);
        Assert.Equal("Band 4.5", ielts.ScaledLabel);
        var pct = MockScoringRules.Score(Test("percent", 60), half);
        Assert.Equal((50.0, false), (pct.Scaled, pct.Passed));
        var none = MockScoringRules.Score(Test("ielts", 6.5), new Dictionary<string, int>());
        Assert.Equal(1.0, none.Scaled);                                         // the floor of the band scale
    }

    [Fact]
    public void The_clock()
    {
        var att = new MockAttempt { StartedAt = "2026-11-08T11:55:00.000Z" };
        Assert.Equal(300, MockScoringRules.SecondsLeft(att, new MockTest { DurationMin = 10 }, Now));
        Assert.Equal(0, MockScoringRules.SecondsLeft(att, new MockTest { DurationMin = 2 }, Now));
    }
}
