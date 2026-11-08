using Microsoft.AspNetCore.Mvc;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Api;
using Ellp.Api.Shared.Auth;
using Ellp.Api.Shared.Data;

namespace Ellp.Api.Modules.Tenants;

/// <summary>The Super Admin's tenants: add, change, remove (removing takes the tenant's programs, lessons, quests, members and messages with it).</summary>
[ApiController]
[Route("api/v1/owners")]
public sealed class OwnersController : ControllerBase
{
    private readonly IEllpStore _s;
    private readonly ICurrentUser _me;
    public OwnersController(IEllpStore s, ICurrentUser me) { _s = s; _me = me; }

    private async Task<IActionResult?> SuperOnly(CancellationToken ct)
    {
        var me = await _me.GetAsync(ct);
        if (me is null) return Unauthorized(ApiResponse<object>.Fail(ApiCodes.Unauthorized, "sign in"));
        if (!RoleRules.IsSuper(me)) return StatusCode(403, ApiResponse<object>.Fail(ApiCodes.Forbidden, "super admin only"));
        return null;
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] Owner o, CancellationToken ct)
    {
        if (await SuperOnly(ct) is { } err) return err;
        if (string.IsNullOrWhiteSpace(o.Code) || string.IsNullOrWhiteSpace(o.Name.Th)) return BadRequest(ApiResponse<object>.Fail(ApiCodes.Validation, "code and name are required"));
        if (string.IsNullOrWhiteSpace(o.Id)) { o.Id = Clock.NewId("own"); o.CreatedAt = Clock.NowIso(); }
        o.Code = o.Code.Trim().ToUpperInvariant();
        await _s.UpsertOwnerAsync(o, ct);
        return Ok(ApiResponse<Owner>.Ok(o));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Remove(string id, CancellationToken ct)
    {
        if (await SuperOnly(ct) is { } err) return err;
        if (await _s.OwnerAsync(id, ct) is null) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "owner not found"));
        await _s.DeleteOwnerAsync(id, ct);
        return Ok(ApiResponse<object?>.Ok(null));
    }
}
