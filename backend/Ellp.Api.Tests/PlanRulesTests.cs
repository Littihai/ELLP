using Ellp.Api.Modules.Access;
using Ellp.Api.Modules.Progress;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Data;

namespace Ellp.Api.Tests;

/// <summary>Plans, previews and the request/decision flow (decision 0005).</summary>
public class PlanRulesTests
{
    private static UserProfile Learner(string plan = "free", string status = "active", string? planTrack = null, string? track = "toeic") =>
        new() { Uid = "u", Role = Role.learner, Track = track, Plan = plan, PlanStatus = status, PlanTrack = planTrack };
    private static readonly LearningProgram FreeProgram = new() { Id = "pf", Track = "foundation", Plan = "free" };
    private static readonly LearningProgram ProToeic = new() { Id = "pt", Track = "toeic", Plan = "pro" };
    private static readonly LearningProgram ProIelts = new() { Id = "pi", Track = "ielts", Plan = "pro" };
    private static readonly LearningProgram PremiumIelts = new() { Id = "pp", Track = "ielts", Plan = "premium" };
    private static readonly List<Lesson> Lessons = new() { new() { Id = "l1", ProgramId = "pt", Order = 1 }, new() { Id = "l2", ProgramId = "pt", Order = 2 } };

    [Fact]
    public void Free_programs_are_open_to_every_learner()
    {
        Assert.True(PlanRules.PlanCoversProgram(Learner(), FreeProgram));
        Assert.True(PlanRules.PlanCoversProgram(Learner("pro", "pending"), FreeProgram));
    }

    [Fact]
    public void Pro_covers_its_track_only_and_never_premium_programs()
    {
        var pro = Learner("pro", "active", "toeic");
        Assert.True(PlanRules.PlanCoversProgram(pro, ProToeic));
        Assert.False(PlanRules.PlanCoversProgram(pro, ProIelts));
        Assert.False(PlanRules.PlanCoversProgram(pro, PremiumIelts));
    }

    [Fact]
    public void Premium_covers_everything_and_staff_too()
    {
        Assert.True(PlanRules.PlanCoversProgram(Learner("premium"), PremiumIelts));
        Assert.True(PlanRules.PlanCoversProgram(new UserProfile { Role = Role.admin }, PremiumIelts));
    }

    [Fact]
    public void Pending_or_expired_counts_as_free()
    {
        Assert.False(PlanRules.PlanCoversProgram(Learner("pro", "pending", "toeic"), ProToeic));
        Assert.False(PlanRules.PlanCoversProgram(Learner("premium", "expired"), ProToeic));
    }

    [Fact]
    public void The_first_lesson_is_a_free_preview_the_second_is_not()
    {
        var free = Learner();
        Assert.True(PlanRules.CanAccessLesson(free, ProToeic, Lessons[0], Lessons));
        Assert.False(PlanRules.CanAccessLesson(free, ProToeic, Lessons[1], Lessons));
        Assert.True(PlanRules.CanAccessLesson(Learner("pro", "active", "toeic"), ProToeic, Lessons[1], Lessons));
    }

    [Fact]
    public void A_request_waits_for_an_admin_and_free_does_not()
    {
        var u = Learner();
        PlanRules.ApplyRequest(u, "pro", null, " slip 123 ", "2026-11-08T10:00:00Z");
        Assert.Equal(("pro", "pending", "toeic", "slip 123"), (u.Plan, u.PlanStatus, u.PlanTrack, u.PlanNote));
        Assert.NotNull(u.PlanRequestedAt);
        PlanRules.ApplyRequest(u, "free", null, "", "2026-11-08T10:01:00Z");
        Assert.Equal(("free", "active"), (u.Plan, u.PlanStatus));
        Assert.Null(u.PlanRequestedAt);
        Assert.Throws<ArgumentException>(() => PlanRules.ApplyRequest(u, "gold", null, "", "x"));
    }

    [Fact]
    public void An_approval_joins_the_learner_to_the_programs_it_covers()
    {
        var u = Learner("pro", "pending", "toeic");
        var tenant = new[] { ProToeic, ProIelts, PremiumIelts, FreeProgram }.Select(p => { p.Published = true; return p; }).ToList();
        var join = PlanRules.ApplyDecision(u, "pro", "active", "toeic", "ok", tenant).Select(p => p.Id).ToList();
        Assert.Equal(new[] { "pt" }, join);                               // the track's pro program only: not ielts, not premium, and free ones were joined at sign-up
        Assert.Equal("active", u.PlanStatus);
        var all = PlanRules.ApplyDecision(u, "premium", "active", null, "", tenant).Select(p => p.Id).ToList();
        Assert.Equal(4, all.Count);
        Assert.Empty(PlanRules.ApplyDecision(u, "pro", "expired", "toeic", "", tenant));
        Assert.Throws<ArgumentException>(() => PlanRules.ApplyDecision(u, "pro", "maybe", null, "", tenant));
    }

    [Fact]
    public async Task The_engine_refuses_a_paid_lesson_without_a_plan_and_allows_the_preview()
    {
        var store = new InMemoryStore();
        var svc = new ProgressService(store);
        var jay = (await store.UserAsync("u_jay", default))!;                 // pro requested, still pending
        var ok = await svc.RecordWatchAsync(jay, "les_toeic1", 100, default);  // the preview opens without a plan
        Assert.Contains(ok.Events, e => e.Kind == "video");
        await svc.SubmitQuizAsync(jay, "les_toeic1", new[] { 1 }, default);     // complete it, so only the plan stands in the way of lesson 2
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.RecordWatchAsync(jay, "les_toeic2", 100, default));
        PlanRules.ApplyDecision(jay, "pro", "active", "toeic", "paid", await store.ProgramsAsync("own_pro", default));
        var r = await svc.RecordWatchAsync(jay, "les_toeic2", 100, default);
        Assert.Contains(r.Events, e => e.Kind == "video");
    }

    [Theory]
    [InlineData(2013, "13-15")] [InlineData(2010, "16-18")] [InlineData(2008, "16-18")] [InlineData(2007, "18+")] [InlineData(1990, "18+")]
    public void Wider_age_bands_for_teens_and_adults(int birthYear, string band) =>
        Assert.Equal(band, GamificationRules.AgeBandFor(GamificationRules.AgeOf(birthYear, new DateTime(2026, 11, 8))));
}
