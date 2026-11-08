using Ellp.Api.Modules.Progress;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Data;

namespace Ellp.Api.Tests;

/// <summary>The engine over the in-memory store: the seeded learner walks Baby Shark → Wheels on the Bus.</summary>
public class ProgressServiceTests
{
    private static (ProgressService Svc, InMemoryStore Store) Make() { var s = new InMemoryStore(); return (new ProgressService(s), s); }

    [Fact]
    public async Task A_locked_lesson_refuses_a_watch()
    {
        var (svc, store) = Make();
        var pim = (await store.UserByEmailAsync("mint.parent@example.com", default))!;
        pim.Xp = 0; pim.BadgeIds.Clear();
        var fresh = new UserProfile { Uid = "u_fresh", DisplayName = "Fresh", Email = "fresh@example.com", Role = Role.learner, OwnerId = "own_sunshine", EnrolledProgramIds = new() { "prg_songs1" }, CreatedAt = Clock.NowIso() };
        await store.UpsertUserAsync(fresh, default);
        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.RecordWatchAsync(fresh, "les_wheels", 100, default));
    }

    [Fact]
    public async Task Watching_the_first_video_pays_xp_streak_and_the_daily_quest()
    {
        var (svc, store) = Make();
        var fresh = new UserProfile { Uid = "u_fresh", DisplayName = "Fresh", Email = "fresh@example.com", Role = Role.learner, OwnerId = "own_sunshine", EnrolledProgramIds = new() { "prg_songs1" }, CreatedAt = Clock.NowIso() };
        await store.UpsertUserAsync(fresh, default);

        var r = await svc.RecordWatchAsync(fresh, "les_babyshark", 50, default);
        Assert.Equal(0, r.XpGained);                                   // under the mark: nothing yet

        r = await svc.RecordWatchAsync(fresh, "les_babyshark", 85, default);
        Assert.Contains(r.Events, e => e.Kind == "video" && e.Xp == 50);
        Assert.Contains(r.Events, e => e.Kind == "streak" && e.Xp == 5);
        Assert.Contains(r.Events, e => e.Kind == "quest" && e.Xp == 20);  // "Watch 1 video today"
        Assert.Equal(75, r.XpGained);
        Assert.Equal(1, fresh.StreakDays);
        Assert.False(r.LessonCompleted);                                // the quiz is still to do

        r = await svc.RecordWatchAsync(fresh, "les_babyshark", 100, default);
        Assert.Equal(0, r.XpGained);                                   // the mark pays once
    }

    [Fact]
    public async Task Passing_the_quiz_completes_the_lesson_and_unlocks_the_next()
    {
        var (svc, store) = Make();
        var fresh = new UserProfile { Uid = "u_fresh", DisplayName = "Fresh", Email = "fresh@example.com", Role = Role.learner, OwnerId = "own_sunshine", EnrolledProgramIds = new() { "prg_songs1" }, CreatedAt = Clock.NowIso() };
        await store.UpsertUserAsync(fresh, default);
        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.SubmitQuizAsync(fresh, "les_babyshark", new[] { 1, 0, 1 }, default));  // watch first

        await svc.RecordWatchAsync(fresh, "les_babyshark", 100, default);
        var r = await svc.SubmitQuizAsync(fresh, "les_babyshark", new[] { 1, 0, 1 }, default);
        Assert.Contains(r.Events, e => e.Kind == "quiz" && e.Xp == 50);  // 3/3 = 30 + 20 bonus
        Assert.True(r.LessonCompleted);
        Assert.Contains(r.NewBadges, b => b.Id == "bdg_first");
        Assert.Contains(r.NewBadges, b => b.Id == "bdg_shark");
        Assert.Equal(2, r.LevelAfter);                                   // 125 XP

        // the next lesson (unlock: Baby Shark complete) now accepts a watch
        var next = await svc.RecordWatchAsync(fresh, "les_wheels", 90, default);
        Assert.Contains(next.Events, e => e.Kind == "video");

        // a worse retake pays nothing and keeps the best score
        var again = await svc.SubmitQuizAsync(fresh, "les_babyshark", new[] { 0, 0, 0 }, default);
        Assert.Equal(0, again.XpGained);
        Assert.Equal(3, again.Progress.QuizScore);
    }

    [Fact]
    public async Task The_leaderboard_ranks_the_tenants_learners_only()
    {
        var (svc, store) = Make();
        var mint = (await store.UserAsync("u_mint", default))!;
        var rows = await svc.LeaderboardAsync(mint, null, "all", default);
        Assert.Equal(new[] { "u_fah", "u_tee", "u_mint" }, rows.Take(3).Select(r => r.Uid));
        Assert.DoesNotContain(rows, r => r.Uid == "u_kao");          // another tenant
        Assert.DoesNotContain(rows, r => r.Uid == "u_admin_ann");    // staff
        Assert.Single(rows, r => r.IsMe);
    }
}
