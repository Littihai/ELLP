using System.Globalization;
using System.Security.Cryptography;
using Ellp.Api.Shared;

namespace Ellp.Api.Modules.Commerce;

/// <summary>Commerce and certificate rules (1.3, decision 0007), the twin of frontend/src/lib/commerce.ts.</summary>
public static class CommerceRules
{
    public const int ExpiringDays = 7;
    public static readonly string[] Methods = { "promptpay", "card", "transfer" };
    public static readonly string[] Providers = { "demo", "omise", "manual" };

    public static int PriceFor(Pricing p, string plan) => plan switch { "pro" => p.Pro, "premium" => p.Premium, _ => 0 };

    /// <summary>The plan runs `months` from the payment, or from the current expiry when it is still in the future (a renewal adds on).</summary>
    public static string PlanExpiry(DateTime fromUtc, int months, string? currentExpiresAt)
    {
        var from = fromUtc;
        if (currentExpiresAt is not null && DateTime.TryParse(currentExpiresAt, null, DateTimeStyles.RoundtripKind, out var cur) && cur.ToUniversalTime() > from) from = cur.ToUniversalTime();
        return from.AddMonths(Math.Max(1, months)).ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'");
    }

    /// <summary>none | active | expiring (within a week) | expired</summary>
    public static string ExpiryStatus(string? expiresAt, DateTime nowUtc)
    {
        if (expiresAt is null || !DateTime.TryParse(expiresAt, null, DateTimeStyles.RoundtripKind, out var t)) return "none";
        var left = t.ToUniversalTime() - nowUtc;
        if (left <= TimeSpan.Zero) return "expired";
        return left <= TimeSpan.FromDays(ExpiringDays) ? "expiring" : "active";
    }

    public static string ReceiptNo(string ownerCode, int year, int seq) => $"{ownerCode}-{year}-{seq:0000}";

    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    /// <summary>ELLP-XXXX-XXXX without 0/O/1/I, from the OS random source.</summary>
    public static string CertificateCode()
    {
        Span<byte> b = stackalloc byte[8];
        RandomNumberGenerator.Fill(b);
        var chars = new char[8];
        for (var i = 0; i < 8; i++) chars[i] = Alphabet[b[i] % Alphabet.Length];
        return $"ELLP-{new string(chars, 0, 4)}-{new string(chars, 4, 4)}";
    }

    public static bool ProgramComplete(IEnumerable<Lesson> lessons, IEnumerable<LessonProgress> progress)
    {
        var pub = lessons.Where(l => l.Published).ToList();
        var done = progress.Where(p => p.Completed).Select(p => p.LessonId).ToHashSet();
        return pub.Count > 0 && pub.All(l => done.Contains(l.Id));
    }

    /// <summary>What a payment does to the learner once it is paid: active plan, expiry, track.</summary>
    public static void ApplyPaid(UserProfile u, Payment pay, DateTime nowUtc)
    {
        u.Plan = pay.Plan;
        u.PlanStatus = "active";
        u.PlanTrack = pay.Plan == "pro" ? (pay.PlanTrack ?? u.Track) : null;
        u.PlanExpiresAt = PlanExpiry(nowUtc, pay.Months, u.PlanExpiresAt);
        u.PlanRequestedAt = null;
    }

    /// <summary>A refund of the plan the learner holds sends them back to free.</summary>
    public static void ApplyRefund(UserProfile u, Payment pay)
    {
        if (u.Plan != pay.Plan) return;
        u.Plan = "free"; u.PlanStatus = "active"; u.PlanTrack = null; u.PlanExpiresAt = null;
    }

    /// <summary>A paid plan past its end is expired. Returns true when something changed.</summary>
    public static bool ExpireIfDue(UserProfile u, DateTime nowUtc)
    {
        if (u.Role != Role.learner || u.Plan == "free" || u.PlanStatus != "active") return false;
        if (ExpiryStatus(u.PlanExpiresAt, nowUtc) != "expired") return false;
        u.PlanStatus = "expired";
        return true;
    }
}

/// <summary>Mock-test scoring (1.3): TOEIC 10–990 in steps of 5, IELTS bands in halves, or percent.</summary>
public static class MockScoringRules
{
    public const int XpPass = 50;
    public const int XpDone = 20;
    public static readonly string[] Scales = { "toeic", "ielts", "percent" };

    public sealed record MockScore(int Raw, int Total, List<SectionScore> Sections, double Scaled, string ScaledLabel, bool Passed);

    public static MockScore Score(MockTest test, IReadOnlyDictionary<string, int> answers)
    {
        var sections = test.Sections.Select(s => new SectionScore { SectionId = s.Id, Raw = s.Questions.Count(q => answers.TryGetValue(q.Id, out var a) && a == q.Answer), Total = s.Questions.Count }).ToList();
        var raw = sections.Sum(s => s.Raw);
        var total = sections.Sum(s => s.Total);
        var frac = total > 0 ? (double)raw / total : 0;
        double scaled; string label;
        switch (test.Scoring)
        {
            case "toeic": scaled = Math.Round((10 + frac * 980) / 5) * 5; label = $"{scaled:0} / 990"; break;
            case "ielts": scaled = Math.Max(1, Math.Round(frac * 9 * 2) / 2); label = $"Band {scaled:0.0}"; break;
            default: scaled = Math.Round(frac * 100); label = $"{scaled:0} %"; break;
        }
        return new MockScore(raw, total, sections, scaled, label, scaled >= test.PassMark);
    }

    public static int SecondsLeft(MockAttempt a, MockTest t, DateTime nowUtc)
    {
        var start = DateTime.Parse(a.StartedAt, null, DateTimeStyles.RoundtripKind).ToUniversalTime();
        return (int)Math.Max(0, Math.Round((start.AddMinutes(t.DurationMin) - nowUtc).TotalSeconds));
    }
}
