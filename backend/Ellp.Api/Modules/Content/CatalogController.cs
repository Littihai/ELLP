using Microsoft.AspNetCore.Mvc;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Api;
using Ellp.Api.Shared.Auth;
using Ellp.Api.Shared.Data;

namespace Ellp.Api.Modules.Content;

/// <summary>What every signed-in person may read: owners (names only matter), programs, lessons, quests, badges. A learner sees their own tenant's content; staff any they manage.</summary>
[ApiController]
[Route("api/v1/catalog")]
public sealed class CatalogController : ControllerBase
{
    private readonly IEllpStore _s;
    private readonly ICurrentUser _me;
    public CatalogController(IEllpStore s, ICurrentUser me) { _s = s; _me = me; }

    [HttpGet("owners")]
    public async Task<IActionResult> Owners(CancellationToken ct)
    {
        var me = await _me.GetAsync(ct);
        if (me is null) return Unauthorized(ApiResponse<object>.Fail(ApiCodes.Unauthorized, "sign in"));
        var all = await _s.OwnersAsync(ct);
        return Ok(ApiResponse<List<Owner>>.Ok(RoleRules.IsSuper(me) ? all : all.Where(o => o.Id == me.OwnerId).ToList()));
    }

    [HttpGet("programs")]
    public async Task<IActionResult> Programs([FromQuery] string? ownerId, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct);
        if (me is null) return Unauthorized(ApiResponse<object>.Fail(ApiCodes.Unauthorized, "sign in"));
        var scope = RoleRules.IsSuper(me) ? ownerId : me.OwnerId;
        var list = await _s.ProgramsAsync(scope, ct);
        if (me.Role == Role.learner) list = list.Where(p => p.Published).ToList();
        return Ok(ApiResponse<List<LearningProgram>>.Ok(list));
    }

    [HttpGet("lessons")]
    public async Task<IActionResult> Lessons([FromQuery] string? programId, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct);
        if (me is null) return Unauthorized(ApiResponse<object>.Fail(ApiCodes.Unauthorized, "sign in"));
        var programs = await _s.ProgramsAsync(RoleRules.IsSuper(me) ? null : me.OwnerId, ct);
        var ids = programs.Select(p => p.Id).ToHashSet();
        var lessons = (await _s.LessonsAsync(programId, ct)).Where(l => ids.Contains(l.ProgramId));
        if (me.Role == Role.learner) lessons = lessons.Where(l => l.Published);
        return Ok(ApiResponse<List<Lesson>>.Ok(lessons.ToList()));
    }

    [HttpGet("quests")]
    public async Task<IActionResult> Quests([FromQuery] string ownerId, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct);
        if (me is null) return Unauthorized(ApiResponse<object>.Fail(ApiCodes.Unauthorized, "sign in"));
        if (!RoleRules.IsSuper(me) && me.OwnerId != ownerId) return StatusCode(403, ApiResponse<object>.Fail(ApiCodes.Forbidden, "not your tenant"));
        return Ok(ApiResponse<List<Quest>>.Ok(await _s.QuestsAsync(ownerId, ct)));
    }

    [HttpGet("badges")]
    public async Task<IActionResult> Badges(CancellationToken ct) => Ok(ApiResponse<List<Badge>>.Ok(await _s.BadgesAsync(ct)));
}
