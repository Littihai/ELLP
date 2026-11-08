using Microsoft.AspNetCore.Mvc;
using Ellp.Api.Shared.Api;
using Ellp.Api.Shared.Auth;

namespace Ellp.Api.Modules.Health;

/// <summary>Is the API up, which version, which store and which auth mode (never any secret).</summary>
[ApiController]
[Route("health")]
public sealed class HealthController : ControllerBase
{
    private readonly AuthOptions _auth;
    private readonly IConfiguration _cfg;
    public HealthController(AuthOptions auth, IConfiguration cfg) { _auth = auth; _cfg = cfg; }

    [HttpGet]
    public IActionResult Get() => Ok(ApiResponse<object>.Ok(new
    {
        status = "ok",
        version = typeof(HealthController).Assembly.GetName().Version?.ToString(3) ?? "1.0.0",
        store = _cfg["Store:Mode"] ?? "InMemory",
        auth = _auth.Mode,
        utc = DateTime.UtcNow,
    }));
}
