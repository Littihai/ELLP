using System.Security.Claims;
using Ellp.Api.Shared.Data;

namespace Ellp.Api.Shared.Auth;

/// <summary>
/// How callers are identified.
///  - <c>Firebase</c>: the Bearer token is a Firebase ID token (issuer https://securetoken.google.com/&lt;project&gt;), validated by
///    JwtBearer against Google's keys; the <c>sub</c> claim is the Firebase uid, which is also the users document id.
///  - <c>Demo</c> (Development only): the header <c>X-Demo-User: &lt;uid&gt;</c> names a seeded user, so the API can be driven from
///    Swagger or the frontend without a Firebase project.
/// </summary>
public sealed class AuthOptions
{
    public string Mode { get; set; } = "Demo";
    public string FirebaseProjectId { get; set; } = "";
}

/// <summary>The signed-in person for this request, resolved once per request from the token (or the demo header).</summary>
public interface ICurrentUser
{
    Task<UserProfile?> GetAsync(CancellationToken ct);
    /// <summary>Email and name from the Firebase token: a first sign-in creates the users document from them.</summary>
    (string? Uid, string? Email, string? Name) Claims { get; }
}

public sealed class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _http;
    private readonly IEllpStore _store;
    private readonly AuthOptions _opt;
    private UserProfile? _cached;
    private bool _resolved;

    public CurrentUser(IHttpContextAccessor http, IEllpStore store, AuthOptions opt) { _http = http; _store = store; _opt = opt; }

    public (string? Uid, string? Email, string? Name) Claims
    {
        get
        {
            var ctx = _http.HttpContext;
            if (ctx is null) return (null, null, null);
            if (_opt.Mode.Equals("Demo", StringComparison.OrdinalIgnoreCase))
            {
                var uid = ctx.Request.Headers["X-Demo-User"].FirstOrDefault();
                return (string.IsNullOrWhiteSpace(uid) ? null : uid, null, null);
            }
            var p = ctx.User;
            var sub = p.FindFirstValue(ClaimTypes.NameIdentifier) ?? p.FindFirstValue("sub") ?? p.FindFirstValue("user_id");
            return (sub, p.FindFirstValue(ClaimTypes.Email) ?? p.FindFirstValue("email"), p.FindFirstValue("name"));
        }
    }

    public async Task<UserProfile?> GetAsync(CancellationToken ct)
    {
        if (_resolved) return _cached;
        _resolved = true;
        var (uid, _, _) = Claims;
        if (uid is null) return null;
        _cached = await _store.UserAsync(uid, ct);
        return _cached is { Active: true } ? _cached : null;
    }
}

public static class RoleRules
{
    public static bool IsStaff(UserProfile u) => u.Role is Role.superadmin or Role.owner or Role.admin;
    public static bool IsSuper(UserProfile u) => u.Role == Role.superadmin;

    /// <summary>May <paramref name="actor"/> touch data of <paramref name="ownerId"/>? The Super Admin may touch any; staff only their own tenant.</summary>
    public static bool CanManageOwner(UserProfile actor, string? ownerId) => IsSuper(actor) || (IsStaff(actor) && actor.OwnerId is not null && actor.OwnerId == ownerId);

    /// <summary>Who may set which role: the Super Admin anything; an owner makes admins and learners of their tenant; an admin only learners.</summary>
    public static bool CanAssignRole(UserProfile actor, Role target) => actor.Role switch
    {
        Role.superadmin => true,
        Role.owner => target is Role.owner or Role.admin or Role.learner,
        Role.admin => target == Role.learner,
        _ => false,
    };
}
