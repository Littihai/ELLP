using Microsoft.AspNetCore.Mvc;
using Ellp.Api.Modules.Access;
using Ellp.Api.Modules.Progress;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Api;
using Ellp.Api.Shared.Auth;
using Ellp.Api.Shared.Data;
using Ellp.Api.Shared.Email;

namespace Ellp.Api.Modules.Commerce;

public sealed record CheckoutInput(string Plan, string? PlanTrack, string Method, string? Note);
public sealed record IssueCertificateInput(string ProgramId);
public sealed record MockSubmitInput(Dictionary<string, int> Answers, bool TimedOut);
public sealed record PaymentStatusInput(string Status);

/// <summary>
/// Payments (checkout, the provider's webhook, receipts), certificates (issue, verify) and mock tests (start, submit).
/// Settling a payment is one method: it activates the plan, joins the covered programs, numbers the receipt and mails it.
/// </summary>
[ApiController]
[Route("api/v1")]
public sealed class CommerceController : ControllerBase
{
    private readonly IEllpStore _s;
    private readonly ICurrentUser _me;
    private readonly GatewayDirectory _gateways;
    private readonly IEmailService _mail;
    private readonly IProgressService _progress;
    private readonly IWebHostEnvironment _env;
    public CommerceController(IEllpStore s, ICurrentUser me, GatewayDirectory gateways, IEmailService mail, IProgressService progress, IWebHostEnvironment env)
    { _s = s; _me = me; _gateways = gateways; _mail = mail; _progress = progress; _env = env; }

    private IActionResult NoUser() => Unauthorized(ApiResponse<object>.Fail(ApiCodes.Unauthorized, "sign in"));

    private async Task<(UserProfile? Me, IActionResult? Error)> Staff(string? ownerId, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct);
        if (me is null) return (null, NoUser());
        if (!RoleRules.IsStaff(me) || (ownerId is not null && !RoleRules.CanManageOwner(me, ownerId))) return (null, StatusCode(403, ApiResponse<object>.Fail(ApiCodes.Forbidden, "not allowed")));
        return (me, null);
    }

    /// <summary>The one place a payment becomes paid: plan, programs, receipt number, receipt email.</summary>
    internal async Task SettleAsync(Payment pay, CancellationToken ct)
    {
        var u = await _s.UserAsync(pay.Uid, ct);
        if (u is null) return;
        var now = DateTime.UtcNow;
        pay.Status = "paid"; pay.PaidAt = Clock.NowIso();
        if (pay.ReceiptNo is null)
        {
            var owner = await _s.OwnerAsync(pay.OwnerId, ct);
            pay.ReceiptNo = CommerceRules.ReceiptNo(owner?.Code ?? "ELLP", now.Year, await _s.NextReceiptSeqAsync(pay.OwnerId, now.Year, ct));
        }
        CommerceRules.ApplyPaid(u, pay, now);
        foreach (var p in PlanRules.ApplyDecision(u, u.Plan, "active", u.PlanTrack, u.PlanNote, await _s.ProgramsAsync(u.OwnerId, ct))) if (!u.EnrolledProgramIds.Contains(p.Id)) u.EnrolledProgramIds.Add(p.Id);
        await _s.UpsertUserAsync(u, ct);
        await _s.UpsertPaymentAsync(pay, ct);
        var settings = await _s.SettingsAsync(pay.OwnerId, ct);
        var outcome = await _mail.SendAsync(new OutgoingMail(u.Email, $"ใบเสร็จ {pay.ReceiptNo} — {pay.Plan} {pay.Amount} {pay.Currency}", $"<p>ขอบคุณที่ชำระเงิน แพ็กเกจ {pay.Plan} ใช้ได้ถึง {u.PlanExpiresAt?[..10]}</p><p>เลขที่ใบเสร็จ {pay.ReceiptNo} · อ้างอิง {pay.Reference}</p>", settings.Email.ReplyTo), settings.Email, ct);
        await _s.AddMailAsync(new MailLog { Id = Clock.NewId("mail"), OwnerId = pay.OwnerId, To = u.Email, Subject = $"ใบเสร็จ {pay.ReceiptNo}", Body = $"{pay.Plan} {pay.Amount} {pay.Currency}", Status = outcome.Status, TestMode = settings.Email.TestMode, At = Clock.NowIso() }, ct);
    }

    // ── payments (learner) ──
    [HttpGet("me/payments")]
    public async Task<IActionResult> MyPayments(CancellationToken ct) { var me = await _me.GetAsync(ct); return me is null ? NoUser() : Ok(ApiResponse<List<Payment>>.Ok(await _s.PaymentsOfUserAsync(me.Uid, ct))); }

    [HttpPost("me/checkout")]
    public async Task<IActionResult> Checkout([FromBody] CheckoutInput input, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        if (input.Plan is not ("pro" or "premium") || !CommerceRules.Methods.Contains(input.Method)) return BadRequest(ApiResponse<object>.Fail(ApiCodes.Validation, "bad plan or method"));
        var settings = await _s.SettingsAsync(me.OwnerId ?? "", ct);
        var provider = input.Method == "transfer" ? "manual" : settings.PaymentProvider;
        if (provider == "manual" && input.Method != "transfer") return Conflict(ApiResponse<object>.Fail(ApiCodes.GatewayOff, "this provider takes transfers only"));
        var pay = new Payment
        {
            Id = Clock.NewId("pay"), Uid = me.Uid, OwnerId = me.OwnerId ?? "", Plan = input.Plan, PlanTrack = input.Plan == "pro" ? (input.PlanTrack ?? me.Track) : null,
            Amount = CommerceRules.PriceFor(settings.Pricing, input.Plan), Currency = "THB", Months = settings.Pricing.Months, Method = input.Method, Provider = provider, Status = "pending",
            Reference = (input.Note ?? "").Trim(), Note = (input.Note ?? "").Trim(), CreatedAt = Clock.NowIso(),
        };
        if (input.Method != "transfer")
        {
            try { var r = await _gateways.For(provider).CreateCheckoutAsync(pay, me, ct); pay.Reference = r.Reference; pay.QrPayload = r.QrPayload; }
            catch (InvalidOperationException ex) { return StatusCode(503, ApiResponse<object>.Fail(ApiCodes.GatewayOff, ex.Message)); }
        }
        else { PlanRules.ApplyRequest(me, input.Plan, input.PlanTrack, input.Note ?? "", Clock.NowIso()); await _s.UpsertUserAsync(me, ct); }
        await _s.UpsertPaymentAsync(pay, ct);
        return Ok(ApiResponse<Payment>.Ok(pay));
    }

    /// <summary>Development only: stands in for the provider's webhook on the demo gateway.</summary>
    [HttpPost("me/payments/{id}/demo-confirm")]
    public async Task<IActionResult> DemoConfirm(string id, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        if (!_env.IsDevelopment()) return NotFound();
        var pay = await _s.PaymentAsync(id, ct);
        if (pay is null || pay.Uid != me.Uid) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "payment not found"));
        if (pay.Provider != "demo") return Conflict(ApiResponse<object>.Fail(ApiCodes.Validation, "not a demo payment"));
        if (pay.Status == "pending") await SettleAsync(pay, ct);
        return Ok(ApiResponse<Payment>.Ok(pay));
    }

    /// <summary>The provider's webhook. Anonymous by nature, so nothing in the body is trusted: the charge is re-read from the provider.</summary>
    [HttpPost("payments/webhook/{provider}")]
    public async Task<IActionResult> Webhook(string provider, [FromBody] System.Text.Json.JsonElement body, CancellationToken ct)
    {
        if (provider != "omise") return NotFound();
        string? chargeId = null;
        try { chargeId = body.GetProperty("data").GetProperty("id").GetString(); } catch { /* an unexpected shape is answered 400 below */ }
        if (string.IsNullOrWhiteSpace(chargeId)) return BadRequest();
        var pay = await _s.PaymentByReferenceAsync(chargeId, ct);
        if (pay is null) return Ok();   // not ours; acknowledge so the provider stops retrying
        if (pay.Status == "pending" && await _gateways.For(provider).IsPaidAsync(chargeId, ct)) await SettleAsync(pay, ct);
        return Ok();
    }

    // ── payments (admin) ──
    [HttpGet("admin/payments")]
    public async Task<IActionResult> Payments([FromQuery] string ownerId, CancellationToken ct)
    { var (_, err) = await Staff(ownerId, ct); if (err is not null) return err; return Ok(ApiResponse<List<Payment>>.Ok(await _s.PaymentsAsync(ownerId, ct))); }

    [HttpPut("admin/payments/{id}/status")]
    public async Task<IActionResult> SetStatus(string id, [FromBody] PaymentStatusInput input, CancellationToken ct)
    {
        var pay = await _s.PaymentAsync(id, ct);
        if (pay is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "payment not found"));
        var (_, err) = await Staff(pay.OwnerId, ct); if (err is not null) return err;
        var u = await _s.UserAsync(pay.Uid, ct);
        switch (input.Status)
        {
            case "paid": if (pay.Status != "paid") await SettleAsync(pay, ct); break;
            case "refunded": pay.Status = "refunded"; if (u is not null) { CommerceRules.ApplyRefund(u, pay); await _s.UpsertUserAsync(u, ct); } await _s.UpsertPaymentAsync(pay, ct); break;
            case "failed": pay.Status = "failed"; if (u is not null && u.PlanStatus == "pending" && u.Plan == pay.Plan) { PlanRules.ApplyRequest(u, "free", null, "", Clock.NowIso()); await _s.UpsertUserAsync(u, ct); } await _s.UpsertPaymentAsync(pay, ct); break;
            default: return BadRequest(ApiResponse<object>.Fail(ApiCodes.Validation, "bad status"));
        }
        return Ok(ApiResponse<Payment>.Ok(pay));
    }

    // ── certificates ──
    [HttpGet("me/certificates")]
    public async Task<IActionResult> MyCertificates(CancellationToken ct) { var me = await _me.GetAsync(ct); return me is null ? NoUser() : Ok(ApiResponse<List<Certificate>>.Ok(await _s.CertificatesOfUserAsync(me.Uid, ct))); }

    [HttpPost("me/certificates")]
    public async Task<IActionResult> Issue([FromBody] IssueCertificateInput input, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var existing = (await _s.CertificatesOfUserAsync(me.Uid, ct)).FirstOrDefault(c => c.ProgramId == input.ProgramId);
        if (existing is not null) return Ok(ApiResponse<Certificate>.Ok(existing));
        var program = (await _s.ProgramsAsync(me.OwnerId, ct)).FirstOrDefault(p => p.Id == input.ProgramId);
        if (program is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "program not found"));
        var lessons = await _s.LessonsAsync(program.Id, ct);
        if (!CommerceRules.ProgramComplete(lessons, await _s.ProgressAsync(me.Uid, ct))) return Conflict(ApiResponse<object>.Fail(ApiCodes.Validation, "PROGRAM_NOT_COMPLETE"));
        var owner = await _s.OwnerAsync(program.OwnerId, ct);
        var cert = new Certificate
        {
            Id = Clock.NewId("cert"), Code = CommerceRules.CertificateCode(), Uid = me.Uid, LearnerName = me.DisplayName, OwnerId = program.OwnerId, OwnerName = owner?.Name ?? new("", ""),
            ProgramId = program.Id, ProgramTitle = program.Title, Track = program.Track, Cefr = program.Cefr, Lessons = lessons.Count(l => l.Published),
            XpEarned = (await _s.XpEventsAsync(me.Uid, null, ct)).Where(e => e.ProgramId == program.Id).Sum(e => e.Xp), IssuedAt = Clock.NowIso(),
        };
        await _s.UpsertCertificateAsync(cert, ct);
        return Ok(ApiResponse<Certificate>.Ok(cert));
    }

    [HttpGet("public/certificates/{code}")]
    public async Task<IActionResult> Verify(string code, CancellationToken ct) => Ok(ApiResponse<Certificate?>.Ok(await _s.CertificateByCodeAsync(code.Trim().ToUpperInvariant(), ct)));

    [HttpGet("admin/certificates")]
    public async Task<IActionResult> Certificates([FromQuery] string ownerId, CancellationToken ct)
    { var (_, err) = await Staff(ownerId, ct); if (err is not null) return err; return Ok(ApiResponse<List<Certificate>>.Ok(await _s.CertificatesAsync(ownerId, ct))); }

    // ── mock tests ──
    [HttpGet("catalog/mock")]
    public async Task<IActionResult> MockTests([FromQuery] string ownerId, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        if (!RoleRules.IsSuper(me) && me.OwnerId != ownerId) return StatusCode(403, ApiResponse<object>.Fail(ApiCodes.Forbidden, "not your tenant"));
        var tests = await _s.MockTestsAsync(ownerId, ct);
        if (me.Role == Role.learner) tests = tests.Where(t => t.Published).Select(StripAnswers).ToList();
        return Ok(ApiResponse<List<MockTest>>.Ok(tests));
    }

    /// <summary>A learner never receives the answer key.</summary>
    private static MockTest StripAnswers(MockTest t) => new()
    {
        Id = t.Id, OwnerId = t.OwnerId, Track = t.Track, Title = t.Title, Description = t.Description, DurationMin = t.DurationMin, Scoring = t.Scoring, PassMark = t.PassMark, RequiredPlan = t.RequiredPlan, Published = t.Published,
        Sections = t.Sections.Select(s => new MockSection { Id = s.Id, Title = s.Title, Questions = s.Questions.Select(q => new MockQuestion { Id = q.Id, Prompt = q.Prompt, Choices = q.Choices, Answer = -1 }).ToList() }).ToList(),
    };

    [HttpPost("me/mock/{testId}/start")]
    public async Task<IActionResult> StartMock(string testId, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var test = (await _s.MockTestsAsync(me.OwnerId ?? "", ct)).FirstOrDefault(t => t.Id == testId && t.Published);
        if (test is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "test not found"));
        if (me.Role == Role.learner && PlanRank(PlanRules.EffectivePlan(me)) < PlanRank(test.RequiredPlan)) return StatusCode(402, ApiResponse<object>.Fail(ApiCodes.PlanRequired, "a plan is needed for this test"));
        var open = (await _s.MockAttemptsOfUserAsync(me.Uid, ct)).FirstOrDefault(a => a.TestId == testId && a.SubmittedAt is null);
        if (open is not null) return Ok(ApiResponse<MockAttempt>.Ok(open));
        var att = new MockAttempt { Id = Clock.NewId("att"), Uid = me.Uid, TestId = testId, OwnerId = test.OwnerId, StartedAt = Clock.NowIso(), Total = test.Sections.Sum(s => s.Questions.Count) };
        await _s.UpsertMockAttemptAsync(att, ct);
        return Ok(ApiResponse<MockAttempt>.Ok(att));
    }

    private static int PlanRank(string plan) => plan switch { "premium" => 2, "pro" => 1, _ => 0 };

    [HttpPost("me/mock/attempts/{id}/submit")]
    public async Task<IActionResult> SubmitMock(string id, [FromBody] MockSubmitInput input, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var att = (await _s.MockAttemptsOfUserAsync(me.Uid, ct)).FirstOrDefault(a => a.Id == id);
        if (att is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "attempt not found"));
        var test = (await _s.MockTestsAsync(att.OwnerId, ct)).FirstOrDefault(t => t.Id == att.TestId);
        if (test is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "test not found"));
        ActivityResult result;
        if (att.SubmittedAt is null)
        {
            // a late submission (past the clock plus a minute of slack) is scored as timed out
            var timedOut = input.TimedOut || MockScoringRules.SecondsLeft(att, test, DateTime.UtcNow) < -60;
            var sc = MockScoringRules.Score(test, input.Answers ?? new());
            att.Answers = input.Answers ?? new(); att.SubmittedAt = Clock.NowIso(); att.TimedOut = timedOut;
            att.Raw = sc.Raw; att.Total = sc.Total; att.SectionScores = sc.Sections; att.Scaled = sc.Scaled; att.ScaledLabel = sc.ScaledLabel; att.Passed = sc.Passed;
            await _s.UpsertMockAttemptAsync(att, ct);
            result = await _progress.AwardAsync(me, null, "quiz", sc.Passed ? MockScoringRules.XpPass : MockScoringRules.XpDone, $"{test.Title.En}: {sc.ScaledLabel}", ct);
        }
        else result = new ActivityResult { Progress = new LessonProgress { Uid = me.Uid, LessonId = $"mock:{test.Id}" }, LevelBefore = GamificationRules.LevelFor(me.Xp), LevelAfter = GamificationRules.LevelFor(me.Xp) };
        return Ok(ApiResponse<object>.Ok(new { attempt = att, result }));
    }

    [HttpGet("me/mock/attempts")]
    public async Task<IActionResult> MyAttempts(CancellationToken ct) { var me = await _me.GetAsync(ct); return me is null ? NoUser() : Ok(ApiResponse<List<MockAttempt>>.Ok(await _s.MockAttemptsOfUserAsync(me.Uid, ct))); }

    [HttpPost("admin/mock")]
    public async Task<IActionResult> SaveMock([FromBody] MockTest t, CancellationToken ct)
    {
        var (_, err) = await Staff(t.OwnerId, ct); if (err is not null) return err;
        if (!MockScoringRules.Scales.Contains(t.Scoring) || !PlanRules.Plans.Contains(t.RequiredPlan) || string.IsNullOrWhiteSpace(t.Title.Th)) return BadRequest(ApiResponse<object>.Fail(ApiCodes.Validation, "bad test"));
        if (string.IsNullOrWhiteSpace(t.Id)) t.Id = Clock.NewId("mock");
        await _s.UpsertMockTestAsync(t, ct);
        return Ok(ApiResponse<MockTest>.Ok(t));
    }

    [HttpDelete("admin/mock/{id}")]
    public async Task<IActionResult> RemoveMock(string id, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var owners = RoleRules.IsSuper(me) ? (await _s.OwnersAsync(ct)).Select(o => o.Id).ToList() : new List<string> { me.OwnerId ?? "" };
        MockTest? t = null;
        foreach (var o in owners) { t = (await _s.MockTestsAsync(o, ct)).FirstOrDefault(x => x.Id == id); if (t is not null) break; }
        if (t is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "test not found"));
        var (_, err) = await Staff(t.OwnerId, ct); if (err is not null) return err;
        await _s.DeleteMockTestAsync(id, ct);
        return Ok(ApiResponse<object?>.Ok(null));
    }

    [HttpGet("admin/mock/attempts")]
    public async Task<IActionResult> Attempts([FromQuery] string ownerId, CancellationToken ct)
    { var (_, err) = await Staff(ownerId, ct); if (err is not null) return err; return Ok(ApiResponse<List<MockAttempt>>.Ok(await _s.MockAttemptsAsync(ownerId, ct))); }
}
