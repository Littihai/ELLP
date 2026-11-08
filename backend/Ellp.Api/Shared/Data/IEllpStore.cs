using Ellp.Api.Shared;

namespace Ellp.Api.Shared.Data;

/// <summary>
/// The data door of the API. Two implementations: <see cref="InMemoryStore"/> (Development, seeded like the frontend demo)
/// and <see cref="FirestoreStore"/> (Firestore through a service account). The services never know which one they talk to.
/// Collections are named as in docs/data-model.md.
/// </summary>
public interface IEllpStore
{
    Task<List<Owner>> OwnersAsync(CancellationToken ct);
    Task<Owner?> OwnerAsync(string id, CancellationToken ct);
    Task UpsertOwnerAsync(Owner o, CancellationToken ct);
    Task DeleteOwnerAsync(string id, CancellationToken ct);

    Task<List<LearningProgram>> ProgramsAsync(string? ownerId, CancellationToken ct);
    Task UpsertProgramAsync(LearningProgram p, CancellationToken ct);
    Task DeleteProgramAsync(string id, CancellationToken ct);

    Task<List<Lesson>> LessonsAsync(string? programId, CancellationToken ct);
    Task<Lesson?> LessonAsync(string id, CancellationToken ct);
    Task UpsertLessonAsync(Lesson l, CancellationToken ct);
    Task DeleteLessonAsync(string id, CancellationToken ct);

    Task<List<Quest>> QuestsAsync(string ownerId, CancellationToken ct);
    Task UpsertQuestAsync(Quest q, CancellationToken ct);
    Task DeleteQuestAsync(string id, CancellationToken ct);

    Task<List<Badge>> BadgesAsync(CancellationToken ct);

    Task<UserProfile?> UserAsync(string uid, CancellationToken ct);
    Task<UserProfile?> UserByEmailAsync(string email, CancellationToken ct);
    Task<List<UserProfile>> UsersAsync(string? ownerId, CancellationToken ct);
    Task UpsertUserAsync(UserProfile u, CancellationToken ct);
    Task DeleteUserAsync(string uid, CancellationToken ct);

    Task<List<LessonProgress>> ProgressAsync(string uid, CancellationToken ct);
    Task<List<LessonProgress>> ProgressOfLessonsAsync(IEnumerable<string> lessonIds, CancellationToken ct);
    Task UpsertProgressAsync(LessonProgress p, CancellationToken ct);

    Task<List<QuestProgress>> QuestProgressAsync(string uid, CancellationToken ct);
    Task UpsertQuestProgressAsync(QuestProgress p, CancellationToken ct);

    Task<List<XpEvent>> XpEventsAsync(string? uid, string? ownerId, CancellationToken ct);
    Task AddXpEventAsync(XpEvent e, CancellationToken ct);

    Task<List<InboxMessage>> MessagesAsync(string? ownerId, string? fromUid, CancellationToken ct);
    Task<InboxMessage?> MessageAsync(string id, CancellationToken ct);
    Task UpsertMessageAsync(InboxMessage m, CancellationToken ct);

    Task<List<MailLog>> MailAsync(string ownerId, CancellationToken ct);
    Task AddMailAsync(MailLog m, CancellationToken ct);

    Task<OwnerSettings> SettingsAsync(string ownerId, CancellationToken ct);
    Task UpsertSettingsAsync(OwnerSettings s, CancellationToken ct);

    Task<List<ChatThread>> ChatsAsync(string ownerId, CancellationToken ct);
    Task<ChatThread?> ChatAsync(string id, CancellationToken ct);
    /// <summary>The open thread of a learner (by uid) or a visitor (by key) with one tenant.</summary>
    Task<ChatThread?> FindChatAsync(string ownerId, string? uid, string? visitorKey, CancellationToken ct);
    Task UpsertChatAsync(ChatThread c, CancellationToken ct);

    Task<List<Violation>> ViolationsAsync(string ownerId, CancellationToken ct);
    Task AddViolationAsync(Violation v, CancellationToken ct);
    Task<List<LearnerSession>> SessionsAsync(string uid, CancellationToken ct);
    Task<List<LearnerSession>> SessionsOfOwnerAsync(string ownerId, CancellationToken ct);
    Task UpsertSessionAsync(LearnerSession s, CancellationToken ct);
}
