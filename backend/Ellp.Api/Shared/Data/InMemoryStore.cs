using System.Collections.Concurrent;
using Ellp.Api.Shared;

namespace Ellp.Api.Shared.Data;

/// <summary>
/// Development store: everything in memory, seeded with the same fictional data as the frontend demo (SeedData.cs), gone on
/// restart. Lets the API run, be tested with Swagger and drive the frontend in live mode without a Firebase project.
/// </summary>
public sealed class InMemoryStore : IEllpStore
{
    private readonly ConcurrentDictionary<string, Owner> _owners = new();
    private readonly ConcurrentDictionary<string, LearningProgram> _programs = new();
    private readonly ConcurrentDictionary<string, Lesson> _lessons = new();
    private readonly ConcurrentDictionary<string, Quest> _quests = new();
    private readonly ConcurrentDictionary<string, Badge> _badges = new();
    private readonly ConcurrentDictionary<string, UserProfile> _users = new();
    private readonly ConcurrentDictionary<string, LessonProgress> _progress = new();      // key uid|lessonId
    private readonly ConcurrentDictionary<string, QuestProgress> _questProgress = new();  // key uid|questId|period
    private readonly ConcurrentBag<XpEvent> _xp = new();
    private readonly ConcurrentDictionary<string, InboxMessage> _messages = new();
    private readonly ConcurrentBag<MailLog> _mail = new();
    private readonly ConcurrentDictionary<string, OwnerSettings> _settings = new();
    private readonly ConcurrentDictionary<string, ChatThread> _chats = new();

    public InMemoryStore()
    {
        // every store gets its own copies: the seed lists are static and a service mutates the objects it reads
        foreach (var x in Copy(SeedData.Owners)) _owners[x.Id] = x;
        foreach (var x in Copy(SeedData.Programs)) _programs[x.Id] = x;
        foreach (var x in Copy(SeedData.Lessons)) _lessons[x.Id] = x;
        foreach (var x in Copy(SeedData.Quests)) _quests[x.Id] = x;
        foreach (var x in Copy(SeedData.Badges)) _badges[x.Id] = x;
        foreach (var x in Copy(SeedData.Users)) _users[x.Uid] = x;
        foreach (var x in Copy(SeedData.Progress)) _progress[$"{x.Uid}|{x.LessonId}"] = x;
        foreach (var x in Copy(SeedData.Settings)) _settings[x.OwnerId] = x;
        foreach (var x in Copy(SeedData.Messages)) _messages[x.Id] = x;
        foreach (var x in Copy(SeedData.Chats)) _chats[x.Id] = x;
    }

    private static readonly System.Text.Json.JsonSerializerOptions CloneJson = new(System.Text.Json.JsonSerializerDefaults.Web) { Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() } };
    private static List<T> Copy<T>(List<T> xs) => System.Text.Json.JsonSerializer.Deserialize<List<T>>(System.Text.Json.JsonSerializer.Serialize(xs, CloneJson), CloneJson)!;

    private static Task<List<T>> L<T>(IEnumerable<T> xs) => Task.FromResult(xs.ToList());

    public Task<List<Owner>> OwnersAsync(CancellationToken ct) => L(_owners.Values.OrderBy(o => o.CreatedAt));
    public Task<Owner?> OwnerAsync(string id, CancellationToken ct) => Task.FromResult(_owners.GetValueOrDefault(id));
    public Task UpsertOwnerAsync(Owner o, CancellationToken ct) { _owners[o.Id] = o; return Task.CompletedTask; }
    public Task DeleteOwnerAsync(string id, CancellationToken ct)
    {
        _owners.TryRemove(id, out _);
        foreach (var p in _programs.Values.Where(p => p.OwnerId == id).ToList()) { _programs.TryRemove(p.Id, out _); foreach (var l in _lessons.Values.Where(l => l.ProgramId == p.Id).ToList()) _lessons.TryRemove(l.Id, out _); }
        foreach (var q in _quests.Values.Where(q => q.OwnerId == id).ToList()) _quests.TryRemove(q.Id, out _);
        foreach (var u in _users.Values.Where(u => u.OwnerId == id).ToList()) _users.TryRemove(u.Uid, out _);
        foreach (var m in _messages.Values.Where(m => m.OwnerId == id).ToList()) _messages.TryRemove(m.Id, out _);
        foreach (var c in _chats.Values.Where(c => c.OwnerId == id).ToList()) _chats.TryRemove(c.Id, out _);
        return Task.CompletedTask;
    }

    public Task<List<LearningProgram>> ProgramsAsync(string? ownerId, CancellationToken ct) => L(_programs.Values.Where(p => ownerId is null || p.OwnerId == ownerId).OrderBy(p => p.CreatedAt));
    public Task UpsertProgramAsync(LearningProgram p, CancellationToken ct) { _programs[p.Id] = p; return Task.CompletedTask; }
    public Task DeleteProgramAsync(string id, CancellationToken ct) { _programs.TryRemove(id, out _); foreach (var l in _lessons.Values.Where(l => l.ProgramId == id).ToList()) _lessons.TryRemove(l.Id, out _); return Task.CompletedTask; }

    public Task<List<Lesson>> LessonsAsync(string? programId, CancellationToken ct) => L(_lessons.Values.Where(l => programId is null || l.ProgramId == programId).OrderBy(l => l.ProgramId).ThenBy(l => l.Order));
    public Task<Lesson?> LessonAsync(string id, CancellationToken ct) => Task.FromResult(_lessons.GetValueOrDefault(id));
    public Task UpsertLessonAsync(Lesson l, CancellationToken ct) { _lessons[l.Id] = l; return Task.CompletedTask; }
    public Task DeleteLessonAsync(string id, CancellationToken ct) { _lessons.TryRemove(id, out _); return Task.CompletedTask; }

    public Task<List<Quest>> QuestsAsync(string ownerId, CancellationToken ct) => L(_quests.Values.Where(q => q.OwnerId == ownerId));
    public Task UpsertQuestAsync(Quest q, CancellationToken ct) { _quests[q.Id] = q; return Task.CompletedTask; }
    public Task DeleteQuestAsync(string id, CancellationToken ct) { _quests.TryRemove(id, out _); return Task.CompletedTask; }

    public Task<List<Badge>> BadgesAsync(CancellationToken ct) => L(_badges.Values);

    public Task<UserProfile?> UserAsync(string uid, CancellationToken ct) => Task.FromResult(_users.GetValueOrDefault(uid));
    public Task<UserProfile?> UserByEmailAsync(string email, CancellationToken ct) => Task.FromResult(_users.Values.FirstOrDefault(u => string.Equals(u.Email, email, StringComparison.OrdinalIgnoreCase)));
    public Task<List<UserProfile>> UsersAsync(string? ownerId, CancellationToken ct) => L(_users.Values.Where(u => ownerId is null || u.OwnerId == ownerId));
    public Task UpsertUserAsync(UserProfile u, CancellationToken ct) { _users[u.Uid] = u; return Task.CompletedTask; }
    public Task DeleteUserAsync(string uid, CancellationToken ct) { _users.TryRemove(uid, out _); return Task.CompletedTask; }

    public Task<List<LessonProgress>> ProgressAsync(string uid, CancellationToken ct) => L(_progress.Values.Where(p => p.Uid == uid));
    public Task<List<LessonProgress>> ProgressOfLessonsAsync(IEnumerable<string> lessonIds, CancellationToken ct) { var set = lessonIds.ToHashSet(); return L(_progress.Values.Where(p => set.Contains(p.LessonId))); }
    public Task UpsertProgressAsync(LessonProgress p, CancellationToken ct) { _progress[$"{p.Uid}|{p.LessonId}"] = p; return Task.CompletedTask; }

    public Task<List<QuestProgress>> QuestProgressAsync(string uid, CancellationToken ct) => L(_questProgress.Values.Where(p => p.Uid == uid));
    public Task UpsertQuestProgressAsync(QuestProgress p, CancellationToken ct) { _questProgress[$"{p.Uid}|{p.QuestId}|{p.PeriodKey}"] = p; return Task.CompletedTask; }

    public Task<List<XpEvent>> XpEventsAsync(string? uid, string? ownerId, CancellationToken ct) => L(_xp.Where(e => (uid is null || e.Uid == uid) && (ownerId is null || e.OwnerId == ownerId)).OrderByDescending(e => e.At));
    public Task AddXpEventAsync(XpEvent e, CancellationToken ct) { _xp.Add(e); return Task.CompletedTask; }

    public Task<List<InboxMessage>> MessagesAsync(string? ownerId, string? fromUid, CancellationToken ct) => L(_messages.Values.Where(m => (ownerId is null || m.OwnerId == ownerId) && (fromUid is null || m.FromUid == fromUid)).OrderByDescending(m => m.CreatedAt));
    public Task<InboxMessage?> MessageAsync(string id, CancellationToken ct) => Task.FromResult(_messages.GetValueOrDefault(id));
    public Task UpsertMessageAsync(InboxMessage m, CancellationToken ct) { _messages[m.Id] = m; return Task.CompletedTask; }

    public Task<List<MailLog>> MailAsync(string ownerId, CancellationToken ct) => L(_mail.Where(m => m.OwnerId == ownerId).OrderByDescending(m => m.At));
    public Task AddMailAsync(MailLog m, CancellationToken ct) { _mail.Add(m); return Task.CompletedTask; }

    public Task<OwnerSettings> SettingsAsync(string ownerId, CancellationToken ct) => Task.FromResult(_settings.GetOrAdd(ownerId, id => new OwnerSettings { OwnerId = id }));
    public Task UpsertSettingsAsync(OwnerSettings s, CancellationToken ct) { _settings[s.OwnerId] = s; return Task.CompletedTask; }

    public Task<List<ChatThread>> ChatsAsync(string ownerId, CancellationToken ct) => L(_chats.Values.Where(c => c.OwnerId == ownerId).OrderByDescending(c => c.UpdatedAt));
    public Task<ChatThread?> ChatAsync(string id, CancellationToken ct) => Task.FromResult(_chats.GetValueOrDefault(id));
    public Task<ChatThread?> FindChatAsync(string ownerId, string? uid, string? visitorKey, CancellationToken ct) =>
        Task.FromResult(_chats.Values.Where(c => c.OwnerId == ownerId && c.Status == "open").FirstOrDefault(c => (uid is not null && c.Uid == uid) || (visitorKey is not null && c.VisitorKey == visitorKey)));
    public Task UpsertChatAsync(ChatThread c, CancellationToken ct) { _chats[c.Id] = c; return Task.CompletedTask; }
}
