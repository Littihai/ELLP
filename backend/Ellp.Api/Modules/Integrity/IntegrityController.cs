using Microsoft.AspNetCore.Mvc;
using Ellp.Api.Modules.Progress;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Api;
using Ellp.Api.Shared.Auth;
using Ellp.Api.Shared.Data;

namespace Ellp.Api.Modules.Integrity;

public sealed record PositionInput(string LessonId, double PositionSec, double WatchedSec, double DurationSec);
public sealed record CheckpointInput(string LessonId, string CheckpointId, bool Correct);
public sealed record ReplayInput(string LessonId);
public sealed record ViolationInput(string? LessonId, string Type, string? Detail);
public sealed record SessionStartInput(string DeviceLabel, string? ExistingId);

public sealed class MediaOptions { public string SigningKey { get; set; } = ""; public int TtlSeconds { get; set; } = VideoTokenRules.DefaultTtlSeconds; }

/// <summary>
/// The player's reports (position, checkpoint, replay), the signed video link, the attention events and the learner's sessions.
/// The ladder and the session decision live in IntegrityRules; the policy comes from the tenant's settings.
/// </summary>
[ApiController]
[Route("api/v1")]
public sealed class IntegrityController : ControllerBase
{
    private readonly IEllpStore _s;
    private readonly ICurrentUser _me;
    private readonly IProgressService _progress;
    private readonly MediaOptions _media;
    public IntegrityController(IEllpStore s, ICurrentUser me, IProgressService progress, MediaOptions media) { _s = s; _me = me; _progress = progress; _media = media; }

    private IActionResult NoUser() => Unauthorized(ApiResponse<object>.Fail(ApiCodes.Unauthorized, "sign in"));

    [HttpPost("me/position")]
    public async Task<IActionResult> Position([FromBody] PositionInput input, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        try { return Ok(ApiResponse<ActivityResult>.Ok(await _progress.RecordPositionAsync(me, input.LessonId, input.PositionSec, input.WatchedSec, input.DurationSec, ct))); }
        catch (KeyNotFoundException) { return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "lesson not found")); }
        catch (InvalidOperationException ex) { return Conflict(ApiResponse<object>.Fail(ex.Message == "LESSON_PAUSED" ? ApiCodes.LessonPaused : ApiCodes.LessonLocked, ex.Message)); }
        catch (UnauthorizedAccessException) { return StatusCode(402, ApiResponse<object>.Fail(ApiCodes.PlanRequired, "a plan is needed for this lesson")); }
    }

    [HttpPost("me/checkpoint")]
    public async Task<IActionResult> Checkpoint([FromBody] CheckpointInput input, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        try { return Ok(ApiResponse<ActivityResult>.Ok(await _progress.RecordCheckpointAsync(me, input.LessonId, input.CheckpointId, input.Correct, ct))); }
        catch (KeyNotFoundException) { return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "lesson or checkpoint not found")); }
    }

    [HttpPost("me/replay")]
    public async Task<IActionResult> Replay([FromBody] ReplayInput input, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        try { return Ok(ApiResponse<LessonProgress>.Ok(await _progress.RecordReplayAsync(me, input.LessonId, ct))); }
        catch (KeyNotFoundException) { return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "lesson not found")); }
    }

    /// <summary>A short-lived signed link to the lesson's self-hosted video, for this learner only.</summary>
    [HttpGet("me/lessons/{lessonId}/video")]
    public async Task<IActionResult> Video(string lessonId, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var lesson = await _s.LessonAsync(lessonId, ct);
        if (lesson is null || string.IsNullOrWhiteSpace(lesson.VideoUrl)) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "no video"));
        var program = (await _s.ProgramsAsync(null, ct)).FirstOrDefault(p => p.Id == lesson.ProgramId);
        if (program is null || !Access.PlanRules.CanAccessLesson(me, program, lesson, await _s.LessonsAsync(program.Id, ct))) return StatusCode(402, ApiResponse<object>.Fail(ApiCodes.PlanRequired, "a plan is needed for this lesson"));
        return Ok(ApiResponse<object>.Ok(new { url = VideoTokenRules.Link(lessonId, me.Uid, _media.SigningKey, DateTimeOffset.UtcNow, _media.TtlSeconds), expiresInSec = _media.TtlSeconds }));
    }

    /// <summary>An attention or player event. The ladder decides; a pause is written on the lesson's progress.</summary>
    [HttpPost("me/violations")]
    public async Task<IActionResult> Violation([FromBody] ViolationInput input, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var policy = (await _s.SettingsAsync(me.OwnerId ?? "", ct)).Integrity;
        var lesson = input.LessonId is null ? null : await _s.LessonAsync(input.LessonId, ct);
        var action = "logged";
        string? pausedUntil = null;
        var strikes = 0;
        if (lesson is not null && IntegrityRules.AttentionTypes.Contains(input.Type))
        {
            var program = (await _s.ProgramsAsync(null, ct)).FirstOrDefault(p => p.Id == lesson.ProgramId);
            var punish = program is not null && IntegrityRules.RulesOf(program).PunishAttention;
            strikes = (await _s.ViolationsAsync(me.OwnerId ?? "", ct)).Count(v => v.Uid == me.Uid && v.LessonId == lesson.Id && IntegrityRules.AttentionTypes.Contains(v.Type) && v.Action != "logged") + 1;
            action = IntegrityRules.LadderAction(strikes, policy, punish);
            if (action == "paused")
            {
                var p = (await _s.ProgressAsync(me.Uid, ct)).FirstOrDefault(x => x.LessonId == lesson.Id) ?? new LessonProgress { Uid = me.Uid, LessonId = lesson.Id, UpdatedAt = Clock.NowIso() };
                p.PausedUntil = DateTime.UtcNow.AddMinutes(policy.PauseMinutes).ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'");
                pausedUntil = p.PausedUntil;
                await _s.UpsertProgressAsync(p, ct);
            }
        }
        var violation = new Violation { Id = Clock.NewId("vio"), Uid = me.Uid, OwnerId = me.OwnerId ?? "", LessonId = input.LessonId, Type = input.Type, Action = action, Detail = (input.Detail ?? "")[..Math.Min(200, (input.Detail ?? "").Length)], At = Clock.NowIso() };
        await _s.AddViolationAsync(violation, ct);
        return Ok(ApiResponse<object>.Ok(new { violation, action, pausedUntil, strikes }));
    }

    /// <summary>A learner's tab or device signs on: allow, warn, end the old session, or refuse (409).</summary>
    [HttpPost("me/sessions")]
    public async Task<IActionResult> StartSession([FromBody] SessionStartInput input, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var now = DateTime.UtcNow;
        var sessions = await _s.SessionsAsync(me.Uid, ct);
        var existing = input.ExistingId is null ? null : sessions.FirstOrDefault(x => x.Id == input.ExistingId && x.Active);
        if (existing is not null) { existing.LastSeenAt = Clock.NowIso(); await _s.UpsertSessionAsync(existing, ct); return Ok(ApiResponse<object>.Ok(new { session = existing, decision = "allow" })); }
        var others = sessions.Where(x => x.Active && IntegrityRules.SessionAlive(x.LastSeenAt, now)).ToList();
        var prior = (await _s.ViolationsAsync(me.OwnerId ?? "", ct)).Count(v => v.Uid == me.Uid && v.Type == "duplicate_session");
        var policy = (await _s.SettingsAsync(me.OwnerId ?? "", ct)).Integrity;
        var decision = IntegrityRules.SessionDecision(others.Count, prior, policy.MaxSessions);
        if (decision != "allow")
        {
            await _s.AddViolationAsync(new Violation { Id = Clock.NewId("vio"), Uid = me.Uid, OwnerId = me.OwnerId ?? "", LessonId = null, Type = "duplicate_session", Action = decision == "warn" ? "warned" : decision == "kick_old" ? "kicked_old" : "refused", Detail = $"{others.Count} other live session(s); {input.DeviceLabel}", At = Clock.NowIso() }, ct);
            if (decision == "refuse") return Conflict(ApiResponse<object>.Fail(ApiCodes.SessionRefused, "too many live sessions"));
            if (decision == "kick_old") foreach (var o in others) { o.Active = false; await _s.UpsertSessionAsync(o, ct); }
        }
        var session = new LearnerSession { Id = Clock.NewId("ses"), Uid = me.Uid, DeviceLabel = input.DeviceLabel, StartedAt = Clock.NowIso(), LastSeenAt = Clock.NowIso(), Active = true };
        await _s.UpsertSessionAsync(session, ct);
        return Ok(ApiResponse<object>.Ok(new { session, decision }));
    }

    [HttpPost("me/sessions/{id}/heartbeat")]
    public async Task<IActionResult> Heartbeat(string id, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var x = (await _s.SessionsAsync(me.Uid, ct)).FirstOrDefault(s => s.Id == id);
        if (x is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "session not found"));
        if (!x.Active) return Conflict(ApiResponse<object>.Fail(ApiCodes.SessionEnded, "this session was ended"));
        x.LastSeenAt = Clock.NowIso();
        await _s.UpsertSessionAsync(x, ct);
        return Ok(ApiResponse<object?>.Ok(null));
    }

    [HttpDelete("me/sessions/{id}")]
    public async Task<IActionResult> EndSession(string id, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var x = (await _s.SessionsAsync(me.Uid, ct)).FirstOrDefault(s => s.Id == id);
        if (x is not null) { x.Active = false; await _s.UpsertSessionAsync(x, ct); }
        return Ok(ApiResponse<object?>.Ok(null));
    }
}

/// <summary>The signed media door: checks the token, then redirects to the stored URL (a storage signed URL or a CDN path).</summary>
[ApiController]
[Route("media")]
public sealed class MediaController : ControllerBase
{
    private readonly IEllpStore _s;
    private readonly MediaOptions _media;
    public MediaController(IEllpStore s, MediaOptions media) { _s = s; _media = media; }

    [HttpGet("{lessonId}")]
    public async Task<IActionResult> Get(string lessonId, [FromQuery] string uid, [FromQuery] long exp, [FromQuery] string sig, CancellationToken ct)
    {
        if (!VideoTokenRules.Verify(lessonId, uid ?? "", exp, sig ?? "", _media.SigningKey, DateTimeOffset.UtcNow)) return StatusCode(403, "expired or invalid link");
        var lesson = await _s.LessonAsync(lessonId, ct);
        if (lesson is null || string.IsNullOrWhiteSpace(lesson.VideoUrl)) return NotFound();
        return Redirect(lesson.VideoUrl);
    }
}
