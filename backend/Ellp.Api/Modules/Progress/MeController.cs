using Microsoft.AspNetCore.Mvc;
using Ellp.Api.Modules.Inbox;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Api;
using Ellp.Api.Shared.Auth;
using Ellp.Api.Shared.Data;

namespace Ellp.Api.Modules.Progress;

public sealed record WatchInput(string LessonId, int WatchedPct);
public sealed record QuizInput(string LessonId, int[] Answers);
public sealed record MessageInput(string Subject, string Body);
public sealed record EnrollInput(string ProgramId);

/// <summary>The signed-in learner's own data and activities. /auth/session is the first call after Firebase sign-in: it returns (and on first visit creates) the profile.</summary>
[ApiController]
[Route("api/v1")]
public sealed class MeController : ControllerBase
{
    private readonly IEllpStore _s;
    private readonly ICurrentUser _me;
    private readonly IProgressService _progress;
    private readonly IInboxService _inbox;
    public MeController(IEllpStore s, ICurrentUser me, IProgressService progress, IInboxService inbox) { _s = s; _me = me; _progress = progress; _inbox = inbox; }

    private IActionResult NoUser() => Unauthorized(ApiResponse<object>.Fail(ApiCodes.Unauthorized, "sign in"));

    /// <summary>The profile behind the token. A Firebase account without a users document gets a learner profile with no tenant: an admin then adds them to one (Members page).</summary>
    [HttpPost("auth/session")]
    public async Task<IActionResult> Session(CancellationToken ct)
    {
        var me = await _me.GetAsync(ct);
        if (me is not null) return Ok(ApiResponse<UserProfile>.Ok(me));
        var (uid, email, name) = _me.Claims;
        if (uid is null) return NoUser();
        var existing = await _s.UserAsync(uid, ct);
        if (existing is { Active: false }) return StatusCode(403, ApiResponse<object>.Fail(ApiCodes.Forbidden, "ACCOUNT_DISABLED"));
        // an invited member (created by an admin with the email before the person signed in) is matched by email and moved to the Firebase uid
        var invited = email is null ? null : await _s.UserByEmailAsync(email, ct);
        var profile = invited ?? new UserProfile { DisplayName = name ?? email ?? uid, Email = email ?? "", Role = Role.learner, CreatedAt = Clock.NowIso(), AvatarColor = "#066fd1" };
        if (invited is not null && invited.Uid != uid) await _s.DeleteUserAsync(invited.Uid, ct);
        profile.Uid = uid;
        await _s.UpsertUserAsync(profile, ct);
        return Ok(ApiResponse<UserProfile>.Ok(profile));
    }

    [HttpGet("me/progress")]
    public async Task<IActionResult> Progress(CancellationToken ct) { var me = await _me.GetAsync(ct); return me is null ? NoUser() : Ok(ApiResponse<List<LessonProgress>>.Ok(await _s.ProgressAsync(me.Uid, ct))); }

    [HttpGet("me/quests")]
    public async Task<IActionResult> Quests(CancellationToken ct) { var me = await _me.GetAsync(ct); return me is null ? NoUser() : Ok(ApiResponse<List<QuestProgress>>.Ok(await _s.QuestProgressAsync(me.Uid, ct))); }

    [HttpGet("me/xp")]
    public async Task<IActionResult> Xp(CancellationToken ct) { var me = await _me.GetAsync(ct); return me is null ? NoUser() : Ok(ApiResponse<List<XpEvent>>.Ok(await _s.XpEventsAsync(me.Uid, null, ct))); }

    [HttpPost("me/watch")]
    public async Task<IActionResult> Watch([FromBody] WatchInput input, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        try { return Ok(ApiResponse<ActivityResult>.Ok(await _progress.RecordWatchAsync(me, input.LessonId, input.WatchedPct, ct))); }
        catch (KeyNotFoundException) { return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "lesson not found")); }
        catch (InvalidOperationException) { return Conflict(ApiResponse<object>.Fail(ApiCodes.LessonLocked, "the lesson is locked")); }
    }

    [HttpPost("me/quiz")]
    public async Task<IActionResult> Quiz([FromBody] QuizInput input, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        try { return Ok(ApiResponse<ActivityResult>.Ok(await _progress.SubmitQuizAsync(me, input.LessonId, input.Answers, ct))); }
        catch (KeyNotFoundException) { return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "lesson not found")); }
        catch (InvalidOperationException) { return Conflict(ApiResponse<object>.Fail(ApiCodes.WatchFirst, "watch the video first")); }
    }

    [HttpGet("leaderboard")]
    public async Task<IActionResult> Leaderboard([FromQuery] string? programId, [FromQuery] string period = "week", CancellationToken ct = default)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var settings = await _s.SettingsAsync(me.OwnerId ?? "", ct);
        if (!settings.Leaderboard.Visible && me.Role == Role.learner) return Ok(ApiResponse<List<LeaderboardRow>>.Ok(new()));
        return Ok(ApiResponse<List<LeaderboardRow>>.Ok(await _progress.LeaderboardAsync(me, programId, period, ct)));
    }

    [HttpGet("me/messages")]
    public async Task<IActionResult> Messages(CancellationToken ct) { var me = await _me.GetAsync(ct); return me is null ? NoUser() : Ok(ApiResponse<List<InboxMessage>>.Ok(await _s.MessagesAsync(null, me.Uid, ct))); }

    [HttpPost("me/messages")]
    public async Task<IActionResult> Send([FromBody] MessageInput input, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        if (string.IsNullOrWhiteSpace(input.Subject) || string.IsNullOrWhiteSpace(input.Body)) return BadRequest(ApiResponse<object>.Fail(ApiCodes.Validation, "subject and body are required"));
        return Ok(ApiResponse<InboxMessage>.Ok(await _inbox.SendAsync(me, input.Subject, input.Body, ct)));
    }

    [HttpPost("me/enroll")]
    public async Task<IActionResult> Enroll([FromBody] EnrollInput input, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var program = (await _s.ProgramsAsync(me.OwnerId, ct)).FirstOrDefault(p => p.Id == input.ProgramId && p.Published);
        if (program is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "program not found"));
        if (!me.EnrolledProgramIds.Contains(program.Id)) { me.EnrolledProgramIds.Add(program.Id); await _s.UpsertUserAsync(me, ct); }
        return Ok(ApiResponse<UserProfile>.Ok(me));
    }
}
