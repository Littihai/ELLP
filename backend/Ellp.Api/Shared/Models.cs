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
    /// <summary>kids | school | toeic | ielts | kpo | foundation (decision 0005).</summary>
    public string Track { get; set; } = "foundation";
    /// <summary>pre-A1 … C1.</summary>
    public string Cefr { get; set; } = "A1";
    public string TargetScore { get; set; } = "";
    /// <summary>The lowest plan that opens every lesson; the first lesson is always a free preview.</summary>
    public string Plan { get; set; } = "free";
    /// <summary>off | standard | strict; null = the track's default (IntegrityRules.DefaultProfileFor).</summary>
    public string? Proctoring { get; set; }
    /// <summary>Who the program is for ("3-5", "6-8", "9-12", "13+"); empty = every age (decision 0004).</summary>
    public List<string> AgeBands { get; set; } = new();
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
    /// <summary>min_age: the age in whole years.</summary>
    public int? Years { get; set; }
    /// <summary>age_band: the bands the learner must be in.</summary>
    public List<string>? Bands { get; set; }
}

public sealed class QuizQuestion
{
    public string Id { get; set; } = "";
    public Text2 Prompt { get; set; } = new("", "");
    public List<string> Choices { get; set; } = new();
    public int Answer { get; set; }
}

/// <summary>An in-video question: the player pauses at AtSec and resumes once answered or when the time runs out.</summary>
public sealed class Checkpoint
{
    public string Id { get; set; } = "";
    public int AtSec { get; set; }
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
    /// <summary>A self-hosted video the platform's own player controls; when set it wins over YoutubeId (1.2).</summary>
    public string VideoUrl { get; set; } = "";
    public List<Checkpoint> Checkpoints { get; set; } = new();
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
    /// <summary>The birth year only (the least data that gives an age band); null = not given.</summary>
    public int? BirthYear { get; set; }
    public string? Track { get; set; }
    public string Plan { get; set; } = "free";
    /// <summary>active | pending (a pro/premium request waits for an admin) | expired.</summary>
    public string PlanStatus { get; set; } = "active";
    public string? PlanTrack { get; set; }
    public string PlanNote { get; set; } = "";
    public string? PlanRequestedAt { get; set; }
    /// <summary>A teacher or parent opened every age band to this learner.</summary>
    public bool AllowAllAges { get; set; }
    public ParentConsent ParentConsent { get; set; } = new();
    public int Xp { get; set; }
    public int StreakDays { get; set; }
    public string? LastActiveDate { get; set; }
    public List<string> BadgeIds { get; set; } = new();
    public string AvatarColor { get; set; } = "#066fd1";
    public bool Active { get; set; } = true;
    public string CreatedAt { get; set; } = "";
}

/// <summary>A parent's or guardian's acknowledgement (a first trace for PDPA s.20; the full consent flow comes with parent accounts).</summary>
public sealed class ParentConsent
{
    public bool Acknowledged { get; set; }
    public string? At { get; set; }
    public string Note { get; set; } = "";
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
    public double WatchedSec { get; set; }
    public double LastPositionSec { get; set; }
    public int Replays { get; set; }
    public Dictionary<string, bool> CheckpointResults { get; set; } = new();
    public string? PausedUntil { get; set; }
}

/// <summary>The tenant's integrity ladder and limits (1.2).</summary>
public sealed class IntegrityPolicy
{
    public int PauseAfterViolations { get; set; } = 3;
    public int PauseMinutes { get; set; } = 10;
    public int MaxSessions { get; set; } = 1;
    public int MaxReplays { get; set; } = 3;
    public int CheckpointTimeLimitSec { get; set; } = 60;
    public int CheckpointXp { get; set; } = 10;
}

public sealed class Violation
{
    public string Id { get; set; } = "";
    public string Uid { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public string? LessonId { get; set; }
    public string Type { get; set; } = "";
    /// <summary>logged | warned | paused | kicked_old | refused</summary>
    public string Action { get; set; } = "logged";
    public string Detail { get; set; } = "";
    public string At { get; set; } = "";
}

public sealed class LearnerSession
{
    public string Id { get; set; } = "";
    public string Uid { get; set; } = "";
    public string DeviceLabel { get; set; } = "";
    public string StartedAt { get; set; } = "";
    public string LastSeenAt { get; set; } = "";
    public bool Active { get; set; } = true;
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

/// <summary>What changes per age band (decision 0004).</summary>
public sealed class AgeRule
{
    public int QuizPassPct { get; set; } = 60;
    public bool LeaderboardVisible { get; set; } = true;
    public bool StreakFreeze { get; set; }
}

public sealed class OwnerSettings
{
    public string OwnerId { get; set; } = "";
    public EmailSettings Email { get; set; } = new();
    public LeaderboardSettings Leaderboard { get; set; } = new();
    /// <summary>Keyed by band ("3-5" ...); a missing band falls back to the defaults in GamificationRules.</summary>
    public Dictionary<string, AgeRule> AgeRules { get; set; } = new();
    public string LineUrl { get; set; } = "";
    public Text2 PaymentInstructions { get; set; } = new("", "");
    public IntegrityPolicy Integrity { get; set; } = new();
}

public sealed class ChatMessage
{
    public string Id { get; set; } = "";
    /// <summary>visitor | admin</summary>
    public string From { get; set; } = "visitor";
    public string ByName { get; set; } = "";
    public string Text { get; set; } = "";
    public string At { get; set; } = "";
}

/// <summary>A chat between a visitor (not signed in yet) or a learner and the tenant's admins (1.1).</summary>
public sealed class ChatThread
{
    public string Id { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public string? Uid { get; set; }
    public string? VisitorKey { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Status { get; set; } = "open";
    public string CreatedAt { get; set; } = "";
    public string UpdatedAt { get; set; } = "";
    public string? LinkedUid { get; set; }
    public List<ChatMessage> Messages { get; set; } = new();
}

public sealed record LeaderboardRow(int Rank, string Uid, string DisplayName, string AvatarColor, int Xp, int Level, bool IsMe);

public static class Clock
{
    public static string NowIso() => DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'");
    public static string NewId(string prefix) => $"{prefix}_{Guid.NewGuid():N}"[..(prefix.Length + 9)];
}
