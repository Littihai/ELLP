using System.Text.Json;
using Google.Cloud.Firestore;
using Ellp.Api.Shared;

namespace Ellp.Api.Shared.Data;

/// <summary>
/// Firestore through the Admin SDK's service account (GOOGLE_APPLICATION_CREDENTIALS or Firebase:CredentialFile).
/// Documents are stored as the JSON shape of the model (camelCase), so the Firestore console shows the same fields the
/// frontend uses and firebase/firestore.rules can reason about them. Collection names: docs/data-model.md.
/// </summary>
public sealed class FirestoreStore : IEllpStore
{
    private readonly FirestoreDb _db;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public FirestoreStore(FirestoreDb db) => _db = db;

    // ── generic helpers: model ⇄ Dictionary via JSON ──
    private static Dictionary<string, object?> ToDoc<T>(T x) => JsonSerializer.Deserialize<Dictionary<string, object?>>(JsonSerializer.Serialize(x, Json), Json)!
        .ToDictionary(k => k.Key, k => Normalize(k.Value));

    /// <summary>System.Text.Json gives JsonElement values; Firestore wants CLR types.</summary>
    private static object? Normalize(object? v) => v switch
    {
        JsonElement e => e.ValueKind switch
        {
            JsonValueKind.String => e.GetString(),
            JsonValueKind.Number => e.TryGetInt64(out var l) ? l : e.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            JsonValueKind.Array => e.EnumerateArray().Select(x => Normalize(x)).ToList(),
            JsonValueKind.Object => e.EnumerateObject().ToDictionary(p => p.Name, p => Normalize(p.Value)),
            _ => null,
        },
        _ => v,
    };

    private static T FromDoc<T>(DocumentSnapshot d) => JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(d.ToDictionary(), Json), Json)!;

    private async Task<List<T>> All<T>(Query q, CancellationToken ct) => (await q.GetSnapshotAsync(ct)).Documents.Select(FromDoc<T>).ToList();
    private async Task<T?> One<T>(string col, string id, CancellationToken ct) where T : class { var s = await _db.Collection(col).Document(id).GetSnapshotAsync(ct); return s.Exists ? FromDoc<T>(s) : null; }
    private Task Set<T>(string col, string id, T x, CancellationToken ct) => _db.Collection(col).Document(id).SetAsync(ToDoc(x), SetOptions.Overwrite, ct);
    private Task Del(string col, string id, CancellationToken ct) => _db.Collection(col).Document(id).DeleteAsync(cancellationToken: ct);
    private Query Where(string col, string? field, object? value) => value is null ? _db.Collection(col) : _db.Collection(col).WhereEqualTo(field!, value);

    public Task<List<Owner>> OwnersAsync(CancellationToken ct) => All<Owner>(_db.Collection("owners"), ct);
    public Task<Owner?> OwnerAsync(string id, CancellationToken ct) => One<Owner>("owners", id, ct);
    public Task UpsertOwnerAsync(Owner o, CancellationToken ct) => Set("owners", o.Id, o, ct);
    public async Task DeleteOwnerAsync(string id, CancellationToken ct)
    {
        foreach (var p in await ProgramsAsync(id, ct)) await DeleteProgramAsync(p.Id, ct);
        foreach (var q in await QuestsAsync(id, ct)) await Del("quests", q.Id, ct);
        foreach (var u in await UsersAsync(id, ct)) await Del("users", u.Uid, ct);
        await Del("owners", id, ct);
    }

    public Task<List<LearningProgram>> ProgramsAsync(string? ownerId, CancellationToken ct) => All<LearningProgram>(Where("programs", "ownerId", ownerId), ct);
    public Task UpsertProgramAsync(LearningProgram p, CancellationToken ct) => Set("programs", p.Id, p, ct);
    public async Task DeleteProgramAsync(string id, CancellationToken ct) { foreach (var l in await LessonsAsync(id, ct)) await Del("lessons", l.Id, ct); await Del("programs", id, ct); }

    public async Task<List<Lesson>> LessonsAsync(string? programId, CancellationToken ct) => (await All<Lesson>(Where("lessons", "programId", programId), ct)).OrderBy(l => l.Order).ToList();
    public Task<Lesson?> LessonAsync(string id, CancellationToken ct) => One<Lesson>("lessons", id, ct);
    public Task UpsertLessonAsync(Lesson l, CancellationToken ct) => Set("lessons", l.Id, l, ct);
    public Task DeleteLessonAsync(string id, CancellationToken ct) => Del("lessons", id, ct);

    public Task<List<Quest>> QuestsAsync(string ownerId, CancellationToken ct) => All<Quest>(Where("quests", "ownerId", ownerId), ct);
    public Task UpsertQuestAsync(Quest q, CancellationToken ct) => Set("quests", q.Id, q, ct);
    public Task DeleteQuestAsync(string id, CancellationToken ct) => Del("quests", id, ct);

    public Task<List<Badge>> BadgesAsync(CancellationToken ct) => All<Badge>(_db.Collection("badges"), ct);

    public Task<UserProfile?> UserAsync(string uid, CancellationToken ct) => One<UserProfile>("users", uid, ct);
    public async Task<UserProfile?> UserByEmailAsync(string email, CancellationToken ct) => (await All<UserProfile>(_db.Collection("users").WhereEqualTo("email", email.ToLowerInvariant()).Limit(1), ct)).FirstOrDefault();
    public Task<List<UserProfile>> UsersAsync(string? ownerId, CancellationToken ct) => All<UserProfile>(Where("users", "ownerId", ownerId), ct);
    public Task UpsertUserAsync(UserProfile u, CancellationToken ct) { u.Email = u.Email.ToLowerInvariant(); return Set("users", u.Uid, u, ct); }
    public Task DeleteUserAsync(string uid, CancellationToken ct) => Del("users", uid, ct);

    public Task<List<LessonProgress>> ProgressAsync(string uid, CancellationToken ct) => All<LessonProgress>(Where("progress", "uid", uid), ct);
    public async Task<List<LessonProgress>> ProgressOfLessonsAsync(IEnumerable<string> lessonIds, CancellationToken ct)
    {
        var all = new List<LessonProgress>();
        foreach (var chunk in lessonIds.Chunk(30)) all.AddRange(await All<LessonProgress>(_db.Collection("progress").WhereIn("lessonId", chunk), ct));
        return all;
    }
    public Task UpsertProgressAsync(LessonProgress p, CancellationToken ct) => Set("progress", $"{p.Uid}_{p.LessonId}", p, ct);

    public Task<List<QuestProgress>> QuestProgressAsync(string uid, CancellationToken ct) => All<QuestProgress>(Where("questProgress", "uid", uid), ct);
    public Task UpsertQuestProgressAsync(QuestProgress p, CancellationToken ct) => Set("questProgress", $"{p.Uid}_{p.QuestId}_{p.PeriodKey}", p, ct);

    public async Task<List<XpEvent>> XpEventsAsync(string? uid, string? ownerId, CancellationToken ct)
    {
        Query q = _db.Collection("xpEvents");
        if (uid is not null) q = q.WhereEqualTo("uid", uid);
        if (ownerId is not null) q = q.WhereEqualTo("ownerId", ownerId);
        return (await All<XpEvent>(q, ct)).OrderByDescending(e => e.At).ToList();
    }
    public Task AddXpEventAsync(XpEvent e, CancellationToken ct) => Set("xpEvents", e.Id, e, ct);

    public async Task<List<InboxMessage>> MessagesAsync(string? ownerId, string? fromUid, CancellationToken ct)
    {
        Query q = _db.Collection("messages");
        if (ownerId is not null) q = q.WhereEqualTo("ownerId", ownerId);
        if (fromUid is not null) q = q.WhereEqualTo("fromUid", fromUid);
        return (await All<InboxMessage>(q, ct)).OrderByDescending(m => m.CreatedAt).ToList();
    }
    public Task<InboxMessage?> MessageAsync(string id, CancellationToken ct) => One<InboxMessage>("messages", id, ct);
    public Task UpsertMessageAsync(InboxMessage m, CancellationToken ct) => Set("messages", m.Id, m, ct);

    public async Task<List<MailLog>> MailAsync(string ownerId, CancellationToken ct) => (await All<MailLog>(Where("mailLog", "ownerId", ownerId), ct)).OrderByDescending(m => m.At).ToList();
    public Task AddMailAsync(MailLog m, CancellationToken ct) => Set("mailLog", m.Id, m, ct);

    public async Task<OwnerSettings> SettingsAsync(string ownerId, CancellationToken ct) => await One<OwnerSettings>("settings", ownerId, ct) ?? new OwnerSettings { OwnerId = ownerId };
    public Task UpsertSettingsAsync(OwnerSettings s, CancellationToken ct) => Set("settings", s.OwnerId, s, ct);

    public async Task<List<ChatThread>> ChatsAsync(string ownerId, CancellationToken ct) => (await All<ChatThread>(Where("chats", "ownerId", ownerId), ct)).OrderByDescending(c => c.UpdatedAt).ToList();
    public Task<ChatThread?> ChatAsync(string id, CancellationToken ct) => One<ChatThread>("chats", id, ct);
    public async Task<ChatThread?> FindChatAsync(string ownerId, string? uid, string? visitorKey, CancellationToken ct)
    {
        var q = _db.Collection("chats").WhereEqualTo("ownerId", ownerId).WhereEqualTo("status", "open");
        if (uid is not null) { var byUid = await All<ChatThread>(q.WhereEqualTo("uid", uid).Limit(1), ct); if (byUid.Count > 0) return byUid[0]; }
        if (visitorKey is not null) { var byKey = await All<ChatThread>(q.WhereEqualTo("visitorKey", visitorKey).Limit(1), ct); if (byKey.Count > 0) return byKey[0]; }
        return null;
    }
    public Task UpsertChatAsync(ChatThread c, CancellationToken ct) => Set("chats", c.Id, c, ct);

    public async Task<List<Violation>> ViolationsAsync(string ownerId, CancellationToken ct) => (await All<Violation>(Where("violations", "ownerId", ownerId), ct)).OrderByDescending(v => v.At).ToList();
    public Task AddViolationAsync(Violation v, CancellationToken ct) => Set("violations", v.Id, v, ct);
    public Task<List<LearnerSession>> SessionsAsync(string uid, CancellationToken ct) => All<LearnerSession>(Where("sessions", "uid", uid), ct);
    public async Task<List<LearnerSession>> SessionsOfOwnerAsync(string ownerId, CancellationToken ct)
    {
        var uids = (await UsersAsync(ownerId, ct)).Select(u => u.Uid).ToList();
        var all = new List<LearnerSession>();
        foreach (var chunk in uids.Chunk(30)) all.AddRange(await All<LearnerSession>(_db.Collection("sessions").WhereIn("uid", chunk), ct));
        return all;
    }
    public Task UpsertSessionAsync(LearnerSession s, CancellationToken ct) => Set("sessions", s.Id, s, ct);

    public async Task<List<Payment>> PaymentsAsync(string ownerId, CancellationToken ct) => (await All<Payment>(Where("payments", "ownerId", ownerId), ct)).OrderByDescending(p => p.CreatedAt).ToList();
    public async Task<List<Payment>> PaymentsOfUserAsync(string uid, CancellationToken ct) => (await All<Payment>(Where("payments", "uid", uid), ct)).OrderByDescending(p => p.CreatedAt).ToList();
    public Task<Payment?> PaymentAsync(string id, CancellationToken ct) => One<Payment>("payments", id, ct);
    public async Task<Payment?> PaymentByReferenceAsync(string reference, CancellationToken ct) => (await All<Payment>(_db.Collection("payments").WhereEqualTo("reference", reference).Limit(1), ct)).FirstOrDefault();
    public Task UpsertPaymentAsync(Payment p, CancellationToken ct) => Set("payments", p.Id, p, ct);
    /// <summary>A transaction over counters/{ownerId}_{year} so two payments never share a number.</summary>
    public async Task<int> NextReceiptSeqAsync(string ownerId, int year, CancellationToken ct)
    {
        var doc = _db.Collection("counters").Document($"{ownerId}_{year}");
        return await _db.RunTransactionAsync(async tx =>
        {
            var snap = await tx.GetSnapshotAsync(doc, ct);
            var next = (snap.Exists && snap.TryGetValue<long>("seq", out var cur) ? (int)cur : 0) + 1;
            tx.Set(doc, new Dictionary<string, object> { ["seq"] = next }, SetOptions.Overwrite);
            return next;
        }, cancellationToken: ct);
    }
    public async Task<List<Certificate>> CertificatesAsync(string ownerId, CancellationToken ct) => (await All<Certificate>(Where("certificates", "ownerId", ownerId), ct)).OrderByDescending(c => c.IssuedAt).ToList();
    public Task<List<Certificate>> CertificatesOfUserAsync(string uid, CancellationToken ct) => All<Certificate>(Where("certificates", "uid", uid), ct);
    public async Task<Certificate?> CertificateByCodeAsync(string code, CancellationToken ct) => (await All<Certificate>(_db.Collection("certificates").WhereEqualTo("code", code).Limit(1), ct)).FirstOrDefault();
    public Task UpsertCertificateAsync(Certificate c, CancellationToken ct) => Set("certificates", c.Id, c, ct);
    public Task<List<MockTest>> MockTestsAsync(string ownerId, CancellationToken ct) => All<MockTest>(Where("mockTests", "ownerId", ownerId), ct);
    public Task UpsertMockTestAsync(MockTest t, CancellationToken ct) => Set("mockTests", t.Id, t, ct);
    public Task DeleteMockTestAsync(string id, CancellationToken ct) => Del("mockTests", id, ct);
    public async Task<List<MockAttempt>> MockAttemptsAsync(string ownerId, CancellationToken ct) => (await All<MockAttempt>(Where("mockAttempts", "ownerId", ownerId), ct)).OrderByDescending(a => a.StartedAt).ToList();
    public async Task<List<MockAttempt>> MockAttemptsOfUserAsync(string uid, CancellationToken ct) => (await All<MockAttempt>(Where("mockAttempts", "uid", uid), ct)).OrderByDescending(a => a.StartedAt).ToList();
    public Task UpsertMockAttemptAsync(MockAttempt a, CancellationToken ct) => Set("mockAttempts", a.Id, a, ct);

    public Task<List<PlacementTest>> PlacementTestsAsync(string ownerId, CancellationToken ct) => All<PlacementTest>(Where("placementTests", "ownerId", ownerId), ct);
    public Task UpsertPlacementTestAsync(PlacementTest t, CancellationToken ct) => Set("placementTests", t.Id, t, ct);
    public Task DeletePlacementTestAsync(string id, CancellationToken ct) => Del("placementTests", id, ct);
    public async Task<List<PlacementResult>> PlacementResultsAsync(string ownerId, CancellationToken ct) => (await All<PlacementResult>(Where("placementResults", "ownerId", ownerId), ct)).OrderByDescending(r => r.SubmittedAt).ToList();
    public async Task<PlacementResult?> PlacementResultOfUserAsync(string uid, CancellationToken ct) => (await All<PlacementResult>(Where("placementResults", "uid", uid), ct)).OrderByDescending(r => r.SubmittedAt).FirstOrDefault();
    public Task<List<PlacementResult>> PlacementResultsOfVisitorAsync(string visitorKey, CancellationToken ct) => All<PlacementResult>(Where("placementResults", "visitorKey", visitorKey), ct);
    public Task UpsertPlacementResultAsync(PlacementResult r, CancellationToken ct) => Set("placementResults", r.Id, r, ct);
    public Task DeletePlacementResultAsync(string id, CancellationToken ct) => Del("placementResults", id, ct);
}
