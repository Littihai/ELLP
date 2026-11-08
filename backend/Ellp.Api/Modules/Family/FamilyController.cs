using Microsoft.AspNetCore.Mvc;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Api;
using Ellp.Api.Shared.Auth;
using Ellp.Api.Shared.Data;
using Ellp.Api.Shared.Email;

namespace Ellp.Api.Modules.Family;

public sealed record ReportEmailInput(string? WeekKey);
public sealed record ChildOverview(UserProfile Child, WeeklyReport Report, WeeklyReport Previous, List<LearningProgram> Programs, List<Lesson> Lessons, List<LessonProgress> Progress, List<XpEvent> Xp, PlacementResult? Placement, List<Certificate> Certificates);

/// <summary>
/// Parent accounts (1.4): a parent reads their children (FamilyRules.CanViewChild), one child's week with the week before,
/// mails the report to themselves, and confirms the acknowledgement on the child's record. Staff send this week's report to
/// every parent of the tenant. Every email goes through the test-mode guard.
/// </summary>
[ApiController]
[Route("api/v1")]
public sealed class FamilyController : ControllerBase
{
    private readonly IEllpStore _s;
    private readonly ICurrentUser _me;
    private readonly IEmailService _mail;
    public FamilyController(IEllpStore s, ICurrentUser me, IEmailService mail) { _s = s; _me = me; _mail = mail; }

    private IActionResult NoUser() => Unauthorized(ApiResponse<object>.Fail(ApiCodes.Unauthorized, "sign in"));
    private IActionResult Forbidden() => StatusCode(403, ApiResponse<object>.Fail(ApiCodes.Forbidden, "not allowed"));

    private async Task<(UserProfile Parent, UserProfile Child)?> ParentAndChild(string uid, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct);
        if (me is null) return null;
        var child = await _s.UserAsync(uid, ct);
        return child is not null && FamilyRules.CanViewChild(me, child) ? (me, child) : null;
    }

    private async Task<(List<LearningProgram> Programs, List<Lesson> Lessons, List<LessonProgress> Progress, List<XpEvent> Xp)> ChildData(UserProfile child, CancellationToken ct)
    {
        var programs = (await _s.ProgramsAsync(child.OwnerId, ct)).Where(p => child.EnrolledProgramIds.Contains(p.Id)).ToList();
        var ids = programs.Select(p => p.Id).ToHashSet();
        var lessons = (await _s.LessonsAsync(null, ct)).Where(l => ids.Contains(l.ProgramId)).ToList();
        return (programs, lessons, await _s.ProgressAsync(child.Uid, ct), await _s.XpEventsAsync(child.Uid, null, ct));
    }

    internal async Task<MailLog> MailReportAsync(UserProfile parent, UserProfile child, string week, CancellationToken ct)
    {
        var (_, lessons, progress, xp) = await ChildData(child, ct);
        var r = FamilyRules.BuildWeeklyReport(child, lessons, progress, xp, week);
        var settings = await _s.SettingsAsync(parent.OwnerId ?? "", ct);
        var subject = $"รายงานประจำสัปดาห์ของ {child.DisplayName} ({r.From} – {r.To})";
        var outcome = await _mail.SendAsync(new OutgoingMail(parent.Email, subject, $"<p>{r.Summary.Th}</p><p>{r.Summary.En}</p><p>XP {r.Xp} · {r.LessonsDone} lessons · {r.ActiveDays} days · {r.Minutes} min</p>", settings.Email.ReplyTo), settings.Email, ct);
        var log = new MailLog { Id = Clock.NewId("mail"), OwnerId = parent.OwnerId ?? "", To = parent.Email, Subject = subject, Body = $"{r.Summary.Th}\n\n{r.Summary.En}", Status = outcome.Status, TestMode = settings.Email.TestMode, At = Clock.NowIso() };
        await _s.AddMailAsync(log, ct);
        return log;
    }

    [HttpGet("me/children")]
    public async Task<IActionResult> Children(CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        if (me.Role != Role.parent) return Ok(ApiResponse<List<UserProfile>>.Ok(new()));
        return Ok(ApiResponse<List<UserProfile>>.Ok((await _s.UsersAsync(me.OwnerId, ct)).Where(u => FamilyRules.CanViewChild(me, u)).ToList()));
    }

    [HttpGet("me/children/{uid}")]
    public async Task<IActionResult> Overview(string uid, [FromQuery] string? week, CancellationToken ct)
    {
        var pc = await ParentAndChild(uid, ct); if (pc is null) return Forbidden();
        var (_, child) = pc.Value;
        var (programs, lessons, progress, xp) = await ChildData(child, ct);
        var weeks = FamilyRules.RecentWeeks(8, DateTime.UtcNow);
        var i = Math.Max(0, weeks.IndexOf(week ?? weeks[0]));
        var report = FamilyRules.BuildWeeklyReport(child, lessons, progress, xp, weeks[i]);
        var previous = FamilyRules.BuildWeeklyReport(child, lessons, progress, xp, i + 1 < weeks.Count ? weeks[i + 1] : weeks[i]);
        return Ok(ApiResponse<ChildOverview>.Ok(new ChildOverview(child, report, previous, programs, lessons, progress, xp, await _s.PlacementResultOfUserAsync(uid, ct), await _s.CertificatesOfUserAsync(uid, ct))));
    }

    [HttpPost("me/children/{uid}/report-email")]
    public async Task<IActionResult> Email(string uid, [FromBody] ReportEmailInput input, CancellationToken ct)
    {
        var pc = await ParentAndChild(uid, ct); if (pc is null) return Forbidden();
        var (parent, child) = pc.Value;
        return Ok(ApiResponse<MailLog>.Ok(await MailReportAsync(parent, child, input.WeekKey ?? FamilyRules.RecentWeeks(0, DateTime.UtcNow)[0], ct)));
    }

    /// <summary>The parent confirms the acknowledgement on the child's record: who confirmed and when, still not an identity check (decisions 0004, 0008).</summary>
    [HttpPost("me/children/{uid}/consent")]
    public async Task<IActionResult> Consent(string uid, CancellationToken ct)
    {
        var pc = await ParentAndChild(uid, ct); if (pc is null) return Forbidden();
        var (parent, child) = pc.Value;
        child.ParentConsent = new ParentConsent { Acknowledged = true, At = Clock.NowIso(), Note = $"parent:{parent.Email}" };
        await _s.UpsertUserAsync(child, ct);
        return Ok(ApiResponse<UserProfile>.Ok(child));
    }

    [HttpPost("admin/reports/send")]
    public async Task<IActionResult> SendAll([FromQuery] string ownerId, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        if (!RoleRules.IsStaff(me) || !RoleRules.CanManageOwner(me, ownerId)) return Forbidden();
        var users = await _s.UsersAsync(ownerId, ct);
        var week = FamilyRules.RecentWeeks(0, DateTime.UtcNow)[0];
        var sent = new List<MailLog>();
        foreach (var parent in users.Where(u => u.Role == Role.parent && u.Active))
            foreach (var child in users.Where(c => FamilyRules.CanViewChild(parent, c)))
                sent.Add(await MailReportAsync(parent, child, week, ct));
        return Ok(ApiResponse<List<MailLog>>.Ok(sent));
    }
}
