using Microsoft.AspNetCore.Mvc;
using Ellp.Api.Modules.Inbox;
using Ellp.Api.Modules.Progress;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Api;
using Ellp.Api.Shared.Auth;
using Ellp.Api.Shared.Data;

namespace Ellp.Api.Modules.Tenants;

public sealed record ReplyInput(string Body);
public sealed record StatusInput(string Status);

public sealed class AdminStats
{
    public int Learners { get; set; }
    public int ActiveToday { get; set; }
    public int Programs { get; set; }
    public int Lessons { get; set; }
    public int OpenMessages { get; set; }
    public int XpThisWeek { get; set; }
    public int CompletionsThisWeek { get; set; }
    public List<DayXp> XpByDay { get; set; } = new();
    public List<TopLesson> TopLessons { get; set; } = new();
}
public sealed record DayXp(string Day, int Xp);
public sealed record TopLesson(Lesson Lesson, int Completions);

/// <summary>
/// The owner console: members, programs, lessons, quests, inbox and replies, mail log, settings, stats. Every call checks
/// RoleRules.CanManageOwner for the tenant it touches: an owner or admin only their own, the Super Admin any.
/// </summary>
[ApiController]
[Route("api/v1/admin")]
public sealed class AdminController : ControllerBase
{
    private readonly IEllpStore _s;
    private readonly ICurrentUser _me;
    private readonly IInboxService _inbox;
    public AdminController(IEllpStore s, ICurrentUser me, IInboxService inbox) { _s = s; _me = me; _inbox = inbox; }

    private IActionResult Forbidden() => StatusCode(403, ApiResponse<object>.Fail(ApiCodes.Forbidden, "not allowed"));
    private IActionResult NoUser() => Unauthorized(ApiResponse<object>.Fail(ApiCodes.Unauthorized, "sign in"));

    /// <summary>The staff member, or null (the caller answers 401/403).</summary>
    private async Task<(UserProfile? Me, IActionResult? Error)> Staff(string? ownerId, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct);
        if (me is null) return (null, NoUser());
        if (!RoleRules.IsStaff(me)) return (null, Forbidden());
        if (ownerId is not null && !RoleRules.CanManageOwner(me, ownerId)) return (null, Forbidden());
        return (me, null);
    }

    // ── members ──
    [HttpGet("members")]
    public async Task<IActionResult> Members([FromQuery] string ownerId, CancellationToken ct)
    { var (me, err) = await Staff(ownerId, ct); if (err is not null) return err; return Ok(ApiResponse<List<UserProfile>>.Ok(await _s.UsersAsync(ownerId, ct))); }

    [HttpPost("members")]
    public async Task<IActionResult> SaveMember([FromBody] UserProfile u, CancellationToken ct)
    {
        var (me, err) = await Staff(u.OwnerId, ct); if (err is not null) return err;
        if (!RoleRules.CanAssignRole(me!, u.Role)) return Forbidden();
        if (u.ParentConsent.Acknowledged && string.IsNullOrWhiteSpace(u.ParentConsent.At)) u.ParentConsent.At = Clock.NowIso();
        if (!u.ParentConsent.Acknowledged) u.ParentConsent.At = null;
        if (string.IsNullOrWhiteSpace(u.Uid)) { u.Uid = Clock.NewId("u"); u.CreatedAt = Clock.NowIso(); }
        else
        {
            var existing = await _s.UserAsync(u.Uid, ct);
            if (existing is not null && !RoleRules.CanManageOwner(me!, existing.OwnerId)) return Forbidden();
            if (existing is not null) { u.Xp = existing.Xp; u.StreakDays = existing.StreakDays; u.LastActiveDate = existing.LastActiveDate; u.BadgeIds = existing.BadgeIds; u.CreatedAt = existing.CreatedAt; }
        }
        await _s.UpsertUserAsync(u, ct);
        return Ok(ApiResponse<UserProfile>.Ok(u));
    }

    [HttpDelete("members/{uid}")]
    public async Task<IActionResult> RemoveMember(string uid, CancellationToken ct)
    {
        var target = await _s.UserAsync(uid, ct);
        if (target is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "member not found"));
        var (me, err) = await Staff(target.OwnerId, ct); if (err is not null) return err;
        if (me!.Uid == uid) return Conflict(ApiResponse<object>.Fail(ApiCodes.Validation, "cannot remove yourself"));
        await _s.DeleteUserAsync(uid, ct);
        return Ok(ApiResponse<object?>.Ok(null));
    }

    // ── programs ──
    [HttpPost("programs")]
    public async Task<IActionResult> SaveProgram([FromBody] LearningProgram p, CancellationToken ct)
    {
        var (_, err) = await Staff(p.OwnerId, ct); if (err is not null) return err;
        if (string.IsNullOrWhiteSpace(p.Id)) { p.Id = Clock.NewId("prg"); p.CreatedAt = Clock.NowIso(); }
        await _s.UpsertProgramAsync(p, ct);
        return Ok(ApiResponse<LearningProgram>.Ok(p));
    }

    [HttpDelete("programs/{id}")]
    public async Task<IActionResult> RemoveProgram(string id, CancellationToken ct)
    {
        var p = (await _s.ProgramsAsync(null, ct)).FirstOrDefault(x => x.Id == id);
        if (p is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "program not found"));
        var (_, err) = await Staff(p.OwnerId, ct); if (err is not null) return err;
        await _s.DeleteProgramAsync(id, ct);
        return Ok(ApiResponse<object?>.Ok(null));
    }

    // ── lessons ──
    private async Task<string?> OwnerOfProgram(string programId, CancellationToken ct) => (await _s.ProgramsAsync(null, ct)).FirstOrDefault(p => p.Id == programId)?.OwnerId;

    [HttpPost("lessons")]
    public async Task<IActionResult> SaveLesson([FromBody] Lesson l, CancellationToken ct)
    {
        var owner = await OwnerOfProgram(l.ProgramId, ct);
        if (owner is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "program not found"));
        var (_, err) = await Staff(owner, ct); if (err is not null) return err;
        if (string.IsNullOrWhiteSpace(l.YoutubeId) || string.IsNullOrWhiteSpace(l.Title.Th)) return BadRequest(ApiResponse<object>.Fail(ApiCodes.Validation, "title and video id are required"));
        if (string.IsNullOrWhiteSpace(l.Id)) l.Id = Clock.NewId("les");
        await _s.UpsertLessonAsync(l, ct);
        return Ok(ApiResponse<Lesson>.Ok(l));
    }

    [HttpDelete("lessons/{id}")]
    public async Task<IActionResult> RemoveLesson(string id, CancellationToken ct)
    {
        var l = await _s.LessonAsync(id, ct);
        if (l is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "lesson not found"));
        var (_, err) = await Staff(await OwnerOfProgram(l.ProgramId, ct), ct); if (err is not null) return err;
        await _s.DeleteLessonAsync(id, ct);
        return Ok(ApiResponse<object?>.Ok(null));
    }

    // ── quests ──
    [HttpPost("quests")]
    public async Task<IActionResult> SaveQuest([FromBody] Quest q, CancellationToken ct)
    {
        var (_, err) = await Staff(q.OwnerId, ct); if (err is not null) return err;
        if (string.IsNullOrWhiteSpace(q.Id)) q.Id = Clock.NewId("qst");
        await _s.UpsertQuestAsync(q, ct);
        return Ok(ApiResponse<Quest>.Ok(q));
    }

    [HttpDelete("quests/{id}")]
    public async Task<IActionResult> RemoveQuest(string id, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var owners = RoleRules.IsSuper(me) ? (await _s.OwnersAsync(ct)).Select(o => o.Id) : new[] { me.OwnerId ?? "" };
        Quest? q = null;
        foreach (var o in owners) { q = (await _s.QuestsAsync(o, ct)).FirstOrDefault(x => x.Id == id); if (q is not null) break; }
        if (q is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "quest not found"));
        var (_, err) = await Staff(q.OwnerId, ct); if (err is not null) return err;
        await _s.DeleteQuestAsync(id, ct);
        return Ok(ApiResponse<object?>.Ok(null));
    }

    // ── inbox and mail ──
    [HttpGet("inbox")]
    public async Task<IActionResult> Inbox([FromQuery] string ownerId, CancellationToken ct)
    { var (_, err) = await Staff(ownerId, ct); if (err is not null) return err; return Ok(ApiResponse<List<InboxMessage>>.Ok(await _s.MessagesAsync(ownerId, null, ct))); }

    [HttpPost("inbox/{id}/reply")]
    public async Task<IActionResult> Reply(string id, [FromBody] ReplyInput input, CancellationToken ct)
    {
        var m = await _s.MessageAsync(id, ct);
        if (m is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "message not found"));
        var (me, err) = await Staff(m.OwnerId, ct); if (err is not null) return err;
        if (string.IsNullOrWhiteSpace(input.Body)) return BadRequest(ApiResponse<object>.Fail(ApiCodes.Validation, "body is required"));
        var (reply, mail) = await _inbox.ReplyAsync(me!, id, input.Body, ct);
        return Ok(ApiResponse<object>.Ok(new { reply, mail }));
    }

    [HttpPut("inbox/{id}/status")]
    public async Task<IActionResult> SetStatus(string id, [FromBody] StatusInput input, CancellationToken ct)
    {
        var m = await _s.MessageAsync(id, ct);
        if (m is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "message not found"));
        var (_, err) = await Staff(m.OwnerId, ct); if (err is not null) return err;
        if (input.Status is not ("open" or "answered" or "closed")) return BadRequest(ApiResponse<object>.Fail(ApiCodes.Validation, "bad status"));
        m.Status = input.Status;
        await _s.UpsertMessageAsync(m, ct);
        return Ok(ApiResponse<InboxMessage>.Ok(m));
    }

    [HttpGet("mail")]
    public async Task<IActionResult> Mail([FromQuery] string ownerId, CancellationToken ct)
    { var (_, err) = await Staff(ownerId, ct); if (err is not null) return err; return Ok(ApiResponse<List<MailLog>>.Ok(await _s.MailAsync(ownerId, ct))); }

    // ── settings ──
    [HttpGet("settings")]
    public async Task<IActionResult> Settings([FromQuery] string ownerId, CancellationToken ct)
    { var (_, err) = await Staff(ownerId, ct); if (err is not null) return err; return Ok(ApiResponse<OwnerSettings>.Ok(await _s.SettingsAsync(ownerId, ct))); }

    [HttpPut("settings")]
    public async Task<IActionResult> SaveSettings([FromBody] OwnerSettings s, CancellationToken ct)
    {
        var (_, err) = await Staff(s.OwnerId, ct); if (err is not null) return err;
        s.Leaderboard.Size = Math.Clamp(s.Leaderboard.Size, 3, 50);
        await _s.UpsertSettingsAsync(s, ct);
        return Ok(ApiResponse<OwnerSettings>.Ok(s));
    }

    // ── stats ──
    [HttpGet("stats")]
    public async Task<IActionResult> Stats([FromQuery] string? ownerId, CancellationToken ct)
    {
        var (me, err) = await Staff(ownerId, ct); if (err is not null) return err;
        if (ownerId is null && !RoleRules.IsSuper(me!)) ownerId = me!.OwnerId;
        var users = (await _s.UsersAsync(ownerId, ct)).Where(u => u.Role == Role.learner).ToList();
        var programs = await _s.ProgramsAsync(ownerId, ct);
        var lessons = (await _s.LessonsAsync(null, ct)).Where(l => programs.Any(p => p.Id == l.ProgramId)).ToList();
        var events = await _s.XpEventsAsync(null, ownerId, ct);
        var progress = await _s.ProgressOfLessonsAsync(lessons.Select(l => l.Id), ct);
        var now = DateTime.UtcNow;
        var today = GamificationRules.DayKey(now);
        var wk = GamificationRules.WeekKey(now);
        static DateTime At(string iso) => DateTime.Parse(iso, null, System.Globalization.DateTimeStyles.RoundtripKind);
        var days = Enumerable.Range(0, 14).Select(i => now.AddDays(-13 + i)).Select(d => { var k = GamificationRules.DayKey(d); return new DayXp(k, events.Where(e => GamificationRules.DayKey(At(e.At)) == k).Sum(e => e.Xp)); }).ToList();
        var completions = progress.Where(p => p.Completed).ToList();
        return Ok(ApiResponse<AdminStats>.Ok(new AdminStats
        {
            Learners = users.Count,
            ActiveToday = users.Count(u => u.LastActiveDate == today),
            Programs = programs.Count,
            Lessons = lessons.Count,
            OpenMessages = (await _s.MessagesAsync(ownerId, null, ct)).Count(m => m.Status == "open"),
            XpThisWeek = events.Where(e => GamificationRules.WeekKey(At(e.At)) == wk).Sum(e => e.Xp),
            CompletionsThisWeek = completions.Count(p => p.CompletedAt is not null && GamificationRules.WeekKey(At(p.CompletedAt)) == wk),
            XpByDay = days,
            TopLessons = lessons.Select(l => new TopLesson(l, completions.Count(p => p.LessonId == l.Id))).OrderByDescending(x => x.Completions).Take(5).ToList(),
        }));
    }
}
