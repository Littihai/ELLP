namespace Ellp.Api.Shared;

/*
 * The domain, one to one with frontend/src/types/index.ts. Every text a learner reads is a { th, en } pair.
 * These are also the Firestore document shapes (docs/data-model.md). Dates travel as ISO-8601 UTC strings so the JSON
 * matches the demo store exactly.
 */

public sealed record Text2(string Th, string En);

public enum Role { superadmin, owner, admin, learner }

public sealed class Owner
{
    public string Id { get; set; } = "";
    public string Code { get; set; } = "";
    public Text2 Name { get; set; } = new("", "");
    public string ContactEmail { get; set; } = "";
    public string Plan { get; set; } = "free";
    public bool Active { get; set; } = true;
    public string CreatedAt { get; set; } = "";
}

public sealed class LearningProgram
{
    public string Id { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public Text2 Title { get; set; } = new("", "");
    public Text2 Description { get; set; } = new("", "");
    public string Level { get; set; } = "beginner";
    public string Color { get; set; } = "#066fd1";
    public bool Published { get; set; }
    public string CreatedAt { get; set; } = "";
}

/// <summary>One unlock condition. <c>Type</c> says which of the other fields is used (as the TypeScript union does).</summary>
public sealed class UnlockRule
{
    public string Type { get; set; } = "lesson_completed";
    public string? LessonId { get; set; }
    public int? Level { get; set; }
    public int? Xp { get; set; }
    public string? QuestId { get; set; }
    public int? Days { get; set; }
}

public sealed class QuizQuestion
{
    public string Id { get; set; } = "";
    public Text2 Prompt { get; set; } = new("", "");
    public List<string> Choices { get; set; } = new();
    public int Answer { get; set; }
}

public sealed class Lesson
{
    public string Id { get; set; } = "";
    public string ProgramId { get; set; } = "";
    public int Order { get; set; }
    public Text2 Title { get; set; } = new("", "");
    public Text2 Summary { get; set; } = new("", "");
    public string YoutubeId { get; set; } = "";
    public int DurationSec { get; set; }
    public int XpReward { get; set; } = 50;
    public List<string> Vocabulary { get; set; } = new();
    public List<QuizQuestion> Quiz { get; set; } = new();
    public List<UnlockRule> Unlock { get; set; } = new();
    public bool Published { get; set; }
}

public sealed class QuestGoal
{
    public string Type { get; set; } = "watch_videos";
    public int Target { get; set; } = 1;
}

public sealed class Quest
{
    public string Id { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public string? ProgramId { get; set; }
    public string Scope { get; set; } = "daily";
    public Text2 Title { get; set; } = new("", "");
    public Text2 Description { get; set; } = new("", "");
    public QuestGoal Goal { get; set; } = new();
    public int XpReward { get; set; }
    public string? BadgeId { get; set; }
    public bool Active { get; set; } = true;
}

public sealed class Badge
{
    public string Id { get; set; } = "";
    public Text2 Name { get; set; } = new("", "");
    public Text2 Description { get; set; } = new("", "");
    public string Icon { get; set; } = "trophy";
}

public sealed class UserProfile
{
    public string Uid { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Email { get; set; } = "";
    public Role Role { get; set; } = Role.learner;
    public string? OwnerId { get; set; }
    public List<string> EnrolledProgramIds { get; set; } = new();
    public int Xp { get; set; }
    public int StreakDays { get; set; }
    public string? LastActiveDate { get; set; }
    public List<string> BadgeIds { get; set; } = new();
    public string AvatarColor { get; set; } = "#066fd1";
    public bool Active { get; set; } = true;
    public string CreatedAt { get; set; } = "";
}

public sealed class LessonProgress
{
    public string Uid { get; set; } = "";
    public string LessonId { get; set; } = "";
    public int WatchedPct { get; set; }
    public bool Completed { get; set; }
    public int? QuizScore { get; set; }
    public int? QuizTotal { get; set; }
    public string? CompletedAt { get; set; }
    public string UpdatedAt { get; set; } = "";
}

public sealed class QuestProgress
{
    public string Uid { get; set; } = "";
    public string QuestId { get; set; } = "";
    public string PeriodKey { get; set; } = "";
    public int Progress { get; set; }
    public bool Completed { get; set; }
    public string? CompletedAt { get; set; }
}

public sealed class XpEvent
{
    public string Id { get; set; } = "";
    public string Uid { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public string? ProgramId { get; set; }
    public string Kind { get; set; } = "video";
    public int Xp { get; set; }
    public string Note { get; set; } = "";
    public string At { get; set; } = "";
}

public sealed class MessageReply
{
    public string Id { get; set; } = "";
    public string ByUid { get; set; } = "";
    public string ByName { get; set; } = "";
    public string Body { get; set; } = "";
    public string At { get; set; } = "";
    public string? MailId { get; set; }
}

public sealed class InboxMessage
{
    public string Id { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public string FromUid { get; set; } = "";
    public string FromName { get; set; } = "";
    public string FromEmail { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Body { get; set; } = "";
    public string Status { get; set; } = "open";
    public string CreatedAt { get; set; } = "";
    public List<MessageReply> Replies { get; set; } = new();
}

public sealed class MailLog
{
    public string Id { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public string To { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Body { get; set; } = "";
    public string Status { get; set; } = "sent";
    public bool TestMode { get; set; } = true;
    public string At { get; set; } = "";
}

public sealed class EmailSettings
{
    public string FromName { get; set; } = "ELLP";
    public string FromAddress { get; set; } = "no-reply@example.com";
    public string ReplyTo { get; set; } = "";
    public bool TestMode { get; set; } = true;
    public List<string> AllowedRecipients { get; set; } = new();
}

public sealed class LeaderboardSettings
{
    public bool Visible { get; set; } = true;
    public int Size { get; set; } = 10;
}

public sealed class OwnerSettings
{
    public string OwnerId { get; set; } = "";
    public EmailSettings Email { get; set; } = new();
    public LeaderboardSettings Leaderboard { get; set; } = new();
}

public sealed record LeaderboardRow(int Rank, string Uid, string DisplayName, string AvatarColor, int Xp, int Level, bool IsMe);

public static class Clock
{
    public static string NowIso() => DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'");
    public static string NewId(string prefix) => $"{prefix}_{Guid.NewGuid():N}"[..(prefix.Length + 9)];
}
