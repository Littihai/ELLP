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
}
