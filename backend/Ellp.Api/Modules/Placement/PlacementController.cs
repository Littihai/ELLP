using Microsoft.AspNetCore.Mvc;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Api;
using Ellp.Api.Shared.Auth;
using Ellp.Api.Shared.Data;

namespace Ellp.Api.Modules.Placement;

public sealed record PlacementSubmitInput(string OwnerId, string TestId, Dictionary<string, int> Answers, string? VisitorKey);

/// <summary>
/// The placement test (1.4): public to read (answers stripped) and to submit; the server scores it, places the person on the
/// ladder and recommends programs. A visitor's result waits under their browser key until sign-up; a learner's is saved on
/// their profile. Staff edit the tests and read the results of their tenant.
/// </summary>
[ApiController]
[Route("api/v1")]
public sealed class PlacementController : ControllerBase
{
    private readonly IEllpStore _s;
    private readonly ICurrentUser _me;
    public PlacementController(IEllpStore s, ICurrentUser me) { _s = s; _me = me; }

    private IActionResult NoUser() => Unauthorized(ApiResponse<object>.Fail(ApiCodes.Unauthorized, "sign in"));

    private async Task<(UserProfile? Me, IActionResult? Error)> Staff(string? ownerId, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct);
        if (me is null) return (null, NoUser());
        if (!RoleRules.IsStaff(me) || (ownerId is not null && !RoleRules.CanManageOwner(me, ownerId))) return (null, StatusCode(403, ApiResponse<object>.Fail(ApiCodes.Forbidden, "not allowed")));
        return (me, null);
    }

    [HttpGet("public/placement")]
    public async Task<IActionResult> PublicTest([FromQuery] string ownerId, CancellationToken ct)
    {
        var t = (await _s.PlacementTestsAsync(ownerId, ct)).FirstOrDefault(x => x.Published);
        return Ok(ApiResponse<PlacementTest?>.Ok(t is null ? null : PlacementRules.Strip(t)));
    }

    [HttpPost("public/placement/submit")]
    public async Task<IActionResult> Submit([FromBody] PlacementSubmitInput input, CancellationToken ct)
    {
        var test = (await _s.PlacementTestsAsync(input.OwnerId, ct)).FirstOrDefault(x => x.Id == input.TestId && x.Published);
        if (test is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "test not found"));
        var me = await _me.GetAsync(ct);
        if (me is null && string.IsNullOrWhiteSpace(input.VisitorKey)) return BadRequest(ApiResponse<object>.Fail(ApiCodes.Validation, "visitorKey is required"));
        var sc = PlacementRules.Score(test, input.Answers ?? new());
        var r = new PlacementResult
        {
            Id = Clock.NewId("plr"), OwnerId = input.OwnerId, TestId = test.Id, Uid = me?.Uid, VisitorKey = me is null ? input.VisitorKey : null, Answers = input.Answers ?? new(),
            Raw = sc.Raw, Total = sc.Total, ByLevel = sc.ByLevel, BySkill = sc.BySkill, Cefr = sc.Cefr,
            RecommendedProgramIds = PlacementRules.RecommendPrograms(sc.Cefr, await _s.ProgramsAsync(input.OwnerId, ct), me?.Track), SubmittedAt = Clock.NowIso(),
        };
        // one result per person per tenant
        var older = me is not null ? (await _s.PlacementResultsAsync(input.OwnerId, ct)).Where(x => x.Uid == me.Uid) : (await _s.PlacementResultsOfVisitorAsync(input.VisitorKey!, ct)).Where(x => x.OwnerId == input.OwnerId);
        foreach (var o in older.ToList()) await _s.DeletePlacementResultAsync(o.Id, ct);
        await _s.UpsertPlacementResultAsync(r, ct);
        if (me is not null) { me.PlacementCefr = r.Cefr; me.PlacementAt = r.SubmittedAt; await _s.UpsertUserAsync(me, ct); }
        return Ok(ApiResponse<PlacementResult>.Ok(r));
    }

    [HttpGet("me/placement")]
    public async Task<IActionResult> Mine(CancellationToken ct) { var me = await _me.GetAsync(ct); return me is null ? NoUser() : Ok(ApiResponse<PlacementResult?>.Ok(await _s.PlacementResultOfUserAsync(me.Uid, ct))); }

    [HttpGet("admin/placement")]
    public async Task<IActionResult> Tests([FromQuery] string ownerId, CancellationToken ct)
    { var (_, err) = await Staff(ownerId, ct); if (err is not null) return err; return Ok(ApiResponse<List<PlacementTest>>.Ok(await _s.PlacementTestsAsync(ownerId, ct))); }

    [HttpPost("admin/placement")]
    public async Task<IActionResult> Save([FromBody] PlacementTest t, CancellationToken ct)
    {
        var (_, err) = await Staff(t.OwnerId, ct); if (err is not null) return err;
        if (string.IsNullOrWhiteSpace(t.Title.Th) || t.Questions.Any(q => !PlacementRules.Skills.Contains(q.Skill) || !Access.PlanRules.Cefr.Contains(q.Cefr))) return BadRequest(ApiResponse<object>.Fail(ApiCodes.Validation, "bad test"));
        if (string.IsNullOrWhiteSpace(t.Id)) t.Id = Clock.NewId("plc");
        await _s.UpsertPlacementTestAsync(t, ct);
        return Ok(ApiResponse<PlacementTest>.Ok(t));
    }

    [HttpDelete("admin/placement/{id}")]
    public async Task<IActionResult> Remove(string id, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct); if (me is null) return NoUser();
        var owners = RoleRules.IsSuper(me) ? (await _s.OwnersAsync(ct)).Select(o => o.Id).ToList() : new List<string> { me.OwnerId ?? "" };
        PlacementTest? t = null;
        foreach (var o in owners) { t = (await _s.PlacementTestsAsync(o, ct)).FirstOrDefault(x => x.Id == id); if (t is not null) break; }
        if (t is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "test not found"));
        var (_, err) = await Staff(t.OwnerId, ct); if (err is not null) return err;
        await _s.DeletePlacementTestAsync(id, ct);
        return Ok(ApiResponse<object?>.Ok(null));
    }

    [HttpGet("admin/placement/results")]
    public async Task<IActionResult> Results([FromQuery] string ownerId, CancellationToken ct)
    { var (_, err) = await Staff(ownerId, ct); if (err is not null) return err; return Ok(ApiResponse<List<PlacementResult>>.Ok(await _s.PlacementResultsAsync(ownerId, ct))); }
}
