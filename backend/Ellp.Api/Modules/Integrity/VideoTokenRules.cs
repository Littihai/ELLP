using System.Security.Cryptography;
using System.Text;

namespace Ellp.Api.Modules.Integrity;

/// <summary>
/// Signed video links (1.2): the player never gets the stored URL; it gets /media/{lessonId}?uid&amp;exp&amp;sig, valid for a few
/// minutes for one learner, and the media endpoint checks the signature before redirecting to (or streaming from) storage.
/// HMAC-SHA256 over "lessonId|uid|exp" with a server-side key (MEDIA_SIGNING_KEY).
/// </summary>
public static class VideoTokenRules
{
    public const int DefaultTtlSeconds = 600;

    public static string Sign(string lessonId, string uid, long expUnix, string key)
    {
        using var h = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var mac = h.ComputeHash(Encoding.UTF8.GetBytes($"{lessonId}|{uid}|{expUnix}"));
        return Convert.ToHexString(mac).ToLowerInvariant();
    }

    public static bool Verify(string lessonId, string uid, long expUnix, string sig, string key, DateTimeOffset now)
    {
        if (expUnix < now.ToUnixTimeSeconds()) return false;
        var expected = Sign(lessonId, uid, expUnix, key);
        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(expected), Encoding.ASCII.GetBytes(sig.ToLowerInvariant()));
    }

    public static string Link(string lessonId, string uid, string key, DateTimeOffset now, int ttlSeconds = DefaultTtlSeconds)
    {
        var exp = now.AddSeconds(ttlSeconds).ToUnixTimeSeconds();
        return $"/media/{Uri.EscapeDataString(lessonId)}?uid={Uri.EscapeDataString(uid)}&exp={exp}&sig={Sign(lessonId, uid, exp, key)}";
    }

    /// <summary>Only Development may fall back to a built-in key; elsewhere a missing key is a configuration error.</summary>
    public static string ResolveKey(string? configured, bool isDevelopment)
    {
        if (!string.IsNullOrWhiteSpace(configured) && configured.Length >= 32) return configured;
        if (isDevelopment) return "ellp-dev-media-signing-key-not-for-production!!";
        throw new InvalidOperationException("Media:SigningKey (MEDIA_SIGNING_KEY) must be set, 32+ characters");
    }
}
