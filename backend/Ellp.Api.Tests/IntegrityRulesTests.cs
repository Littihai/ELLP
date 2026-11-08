using Ellp.Api.Modules.Integrity;
using Ellp.Api.Modules.Progress;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Data;

namespace Ellp.Api.Tests;

/// <summary>The learning-integrity ladder, sessions, profiles, signed links and the player reports (decision 0006).</summary>
public class IntegrityRulesTests
{
    private static readonly IntegrityPolicy Policy = new();

    [Theory]
    [InlineData("kids", "off")] [InlineData("foundation", "standard")] [InlineData("toeic", "strict")] [InlineData("school", "strict")]
    public void Each_track_has_a_default_profile(string track, string profile) => Assert.Equal(profile, IntegrityRules.DefaultProfileFor(track));

    [Fact]
    public void A_program_may_override_its_profile()
    {
        Assert.Equal("strict", IntegrityRules.ProfileOf(new LearningProgram { Track = "toeic" }));
        Assert.Equal("standard", IntegrityRules.ProfileOf(new LearningProgram { Track = "toeic", Proctoring = "standard" }));
        Assert.Equal("off", IntegrityRules.ProfileOf(new LearningProgram { Track = "kids", Proctoring = "bogus" }));
        Assert.True(IntegrityRules.RulesOf(new LearningProgram { Track = "ielts" }).Watermark);
        Assert.False(IntegrityRules.RulesOf(new LearningProgram { Track = "foundation" }).PunishAttention);
    }

    [Fact]
    public void The_ladder_warns_twice_and_pauses_the_third_time()
    {
        Assert.Equal("warned", IntegrityRules.LadderAction(1, Policy, punish: true));
        Assert.Equal("warned", IntegrityRules.LadderAction(2, Policy, punish: true));
        Assert.Equal("paused", IntegrityRules.LadderAction(3, Policy, punish: true));
        Assert.Equal("paused", IntegrityRules.LadderAction(7, Policy, punish: true));
        Assert.Equal("logged", IntegrityRules.LadderAction(3, Policy, punish: false));
        Assert.Equal("paused", IntegrityRules.LadderAction(2, new IntegrityPolicy { PauseAfterViolations = 2 }, punish: true));
    }

    [Fact]
    public void Sessions_warn_then_end_the_old_one_then_refuse()
    {
        Assert.Equal("allow", IntegrityRules.SessionDecision(0, 0, 1));
        Assert.Equal("warn", IntegrityRules.SessionDecision(1, 0, 1));
        Assert.Equal("kick_old", IntegrityRules.SessionDecision(1, 1, 1));
        Assert.Equal("refuse", IntegrityRules.SessionDecision(1, 2, 1));
        Assert.Equal("allow", IntegrityRules.SessionDecision(1, 5, 2));   // two devices allowed
    }

    [Fact]
    public void A_session_is_alive_for_ninety_seconds_after_its_heartbeat()
    {
        var now = new DateTime(2026, 11, 8, 12, 0, 0, DateTimeKind.Utc);
        Assert.True(IntegrityRules.SessionAlive("2026-11-08T11:59:00.000Z", now));
        Assert.False(IntegrityRules.SessionAlive("2026-11-08T11:58:00.000Z", now));
        Assert.False(IntegrityRules.SessionAlive("garbage", now));
    }

    [Fact]
    public void Pause_replay_seek_and_percent_checks()
    {
        var now = new DateTime(2026, 11, 8, 12, 0, 0, DateTimeKind.Utc);
        Assert.True(IntegrityRules.IsPaused(new LessonProgress { PausedUntil = "2026-11-08T12:05:00.000Z" }, now));
        Assert.False(IntegrityRules.IsPaused(new LessonProgress { PausedUntil = "2026-11-08T11:55:00.000Z" }, now));
        Assert.False(IntegrityRules.IsPaused(null, now));
        Assert.True(IntegrityRules.ReplayAllowed(new LessonProgress { Replays = 2 }, Policy, enforce: true));
        Assert.False(IntegrityRules.ReplayAllowed(new LessonProgress { Replays = 3 }, Policy, enforce: true));
        Assert.True(IntegrityRules.ReplayAllowed(new LessonProgress { Replays = 30 }, Policy, enforce: false));
        Assert.True(IntegrityRules.ReplayAllowed(new LessonProgress { Replays = 30 }, new IntegrityPolicy { MaxReplays = 0 }, enforce: true));
        Assert.True(IntegrityRules.SeekAllowed(40, 39.5, block: true));
        Assert.False(IntegrityRules.SeekAllowed(60, 39.5, block: true));
        Assert.True(IntegrityRules.SeekAllowed(60, 39.5, block: false));
        Assert.Equal(50, IntegrityRules.PercentOf(10, 20));
        Assert.Equal(100, IntegrityRules.PercentOf(25, 20));
        Assert.Equal(0, IntegrityRules.PercentOf(10, 0));
    }

    [Fact]
    public void Signed_links_verify_for_the_right_learner_until_they_expire()
    {
        const string key = "0123456789abcdef0123456789abcdef";
        var now = new DateTimeOffset(2026, 11, 8, 12, 0, 0, TimeSpan.Zero);
        var exp = now.AddMinutes(10).ToUnixTimeSeconds();
        var sig = VideoTokenRules.Sign("les_toeic1", "u_jay", exp, key);
        Assert.True(VideoTokenRules.Verify("les_toeic1", "u_jay", exp, sig, key, now));
        Assert.False(VideoTokenRules.Verify("les_toeic1", "u_mint", exp, sig, key, now));          // another learner
        Assert.False(VideoTokenRules.Verify("les_toeic2", "u_jay", exp, sig, key, now));           // another lesson
        Assert.False(VideoTokenRules.Verify("les_toeic1", "u_jay", exp, sig, key, now.AddMinutes(11)));   // expired
        Assert.False(VideoTokenRules.Verify("les_toeic1", "u_jay", exp, sig, "another-key-another-key-another-key!!", now));
        var link = VideoTokenRules.Link("les_toeic1", "u_jay", key, now);
        Assert.StartsWith("/media/les_toeic1?uid=u_jay&exp=", link);
        Assert.Throws<InvalidOperationException>(() => VideoTokenRules.ResolveKey("short", isDevelopment: false));
        Assert.Equal(key, VideoTokenRules.ResolveKey(key, isDevelopment: false));
    }

    [Fact]
    public async Task The_player_report_credits_the_video_at_the_mark_and_a_checkpoint_pays_once()
    {
        var store = new InMemoryStore();
        var svc = new ProgressService(store);
        var ann = (await store.UserAsync("u_ann2", default))!;          // premium: the IELTS lesson is open
        var half = await svc.RecordPositionAsync(ann, "les_ielts1", 10, 10, 20, default);
        Assert.Equal(0, half.XpGained);                                 // 50 %: under the mark
        var done = await svc.RecordPositionAsync(ann, "les_ielts1", 17, 17, 20, default);
        Assert.Contains(done.Events, e => e.Kind == "video");           // 85 %
        Assert.Equal(17, done.Progress.LastPositionSec);
        var cp = await svc.RecordCheckpointAsync(ann, "les_ielts1", "cp1", true, default);
        Assert.Contains(cp.Events, e => e.Kind == "quiz" && e.Xp == 10);
        var again = await svc.RecordCheckpointAsync(ann, "les_ielts1", "cp1", true, default);
        Assert.Equal(0, again.XpGained);                                // once per checkpoint
        await Assert.ThrowsAsync<KeyNotFoundException>(() => svc.RecordCheckpointAsync(ann, "les_ielts1", "nope", true, default));
        var p = await svc.RecordReplayAsync(ann, "les_ielts1", default);
        Assert.Equal(1, p.Replays);
    }

    [Fact]
    public async Task A_paused_lesson_refuses_a_watch()
    {
        var store = new InMemoryStore();
        var svc = new ProgressService(store);
        var ann = (await store.UserAsync("u_ann2", default))!;
        var p = new LessonProgress { Uid = ann.Uid, LessonId = "les_ielts1", WatchedPct = 60, UpdatedAt = Clock.NowIso(), PausedUntil = DateTime.UtcNow.AddMinutes(5).ToString("o") };
        await store.UpsertProgressAsync(p, default);
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => svc.RecordWatchAsync(ann, "les_ielts1", 100, default));
        Assert.Equal("LESSON_PAUSED", ex.Message);
    }
}
