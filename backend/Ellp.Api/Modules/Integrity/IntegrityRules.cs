using Ellp.Api.Shared;

namespace Ellp.Api.Modules.Integrity;

/// <summary>What a proctoring profile switches on (the twin of frontend/src/lib/integrity.ts PROFILE_RULES).</summary>
public sealed record ProfileRules(bool TrackAttention, bool PunishAttention, bool BlockSeek, bool LockSpeed, bool RequireFullscreen, bool Checkpoints, bool ReplayLimit, bool SessionLimit, bool Watermark, bool NoCopy);

/// <summary>
/// Learning-integrity rules (1.2, decision 0006), pure and tested: the ladder for attention events, the session decision,
/// the per-track default profile, and the small player checks the server repeats when it records.
/// </summary>
public static class IntegrityRules
{
    public static readonly string[] Profiles = { "off", "standard", "strict" };
    public static readonly string[] AttentionTypes = { "tab_switch", "window_blur", "fullscreen_exit" };
    public const int SessionTtlSec = 90;

    public static readonly IReadOnlyDictionary<string, ProfileRules> ProfileRulesByName = new Dictionary<string, ProfileRules>
    {
        ["off"] = new(false, false, false, false, false, false, false, false, false, false),
        ["standard"] = new(true, false, true, true, false, true, false, true, false, false),
        ["strict"] = new(true, true, true, true, true, true, true, true, true, true),
    };

    public static string DefaultProfileFor(string track) => track switch { "kids" => "off", "foundation" => "standard", _ => "strict" };

    public static string ProfileOf(LearningProgram p) => p.Proctoring is { Length: > 0 } x && Profiles.Contains(x) ? x : DefaultProfileFor(p.Track);

    public static ProfileRules RulesOf(LearningProgram p) => ProfileRulesByName[ProfileOf(p)];

    /// <summary>The n-th attention strike in a lesson: warned until the threshold, where the lesson is paused; a non-punishing profile only logs.</summary>
    public static string LadderAction(int strikeNumber, IntegrityPolicy policy, bool punish)
        => !punish ? "logged" : strikeNumber >= policy.PauseAfterViolations ? "paused" : "warned";

    /// <summary>A new session while others are live: warn, then end the old one, then refuse.</summary>
    public static string SessionDecision(int activeOthers, int priorDuplicates, int maxSessions)
    {
        if (activeOthers < Math.Max(1, maxSessions)) return "allow";
        return priorDuplicates switch { 0 => "warn", 1 => "kick_old", _ => "refuse" };
    }

    public static bool SessionAlive(string lastSeenIso, DateTime nowUtc)
        => DateTime.TryParse(lastSeenIso, null, System.Globalization.DateTimeStyles.RoundtripKind, out var t) && (nowUtc - t.ToUniversalTime()).TotalSeconds < SessionTtlSec;

    public static bool IsPaused(LessonProgress? p, DateTime nowUtc)
        => p?.PausedUntil is string s && DateTime.TryParse(s, null, System.Globalization.DateTimeStyles.RoundtripKind, out var t) && t.ToUniversalTime() > nowUtc;

    public static bool ReplayAllowed(LessonProgress? p, IntegrityPolicy policy, bool enforce)
        => !enforce || policy.MaxReplays <= 0 || (p?.Replays ?? 0) < policy.MaxReplays;

    public static bool SeekAllowed(double target, double furthest, bool block) => !block || target <= furthest + 1;

    /// <summary>The percentage the player's position stands for; the server never trusts a percentage it did not compute.</summary>
    public static int PercentOf(double positionSec, double durationSec) => durationSec <= 0 ? 0 : (int)Math.Clamp(Math.Round(positionSec / durationSec * 100), 0, 100);
}
