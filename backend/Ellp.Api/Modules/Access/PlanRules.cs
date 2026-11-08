using Ellp.Api.Shared;

namespace Ellp.Api.Modules.Access;

/// <summary>
/// Plan rules (1.1, decision 0005), the server twin of frontend/src/lib/access.ts:
/// a free program is open to everyone signed in; the first lesson of every program is a free preview; pro opens every lesson
/// of the programs in the learner's chosen track that need pro or less; premium opens everything; pending or expired counts
/// as free; staff see everything.
/// </summary>
public static class PlanRules
{
    public static readonly string[] Plans = { "free", "pro", "premium" };
    public static readonly string[] Tracks = { "kids", "school", "toeic", "ielts", "kpo", "foundation" };
    public static readonly string[] Cefr = { "pre-A1", "A1", "A2", "B1", "B2", "C1" };

    public static string EffectivePlan(UserProfile u) => u.PlanStatus == "active" ? u.Plan : "free";

    public static bool IsPreviewLesson(Lesson lesson, IEnumerable<Lesson> lessonsOfProgram)
    {
        var first = lessonsOfProgram.Where(l => l.ProgramId == lesson.ProgramId).OrderBy(l => l.Order).FirstOrDefault();
        return first?.Id == lesson.Id;
    }

    public static bool PlanCoversProgram(UserProfile u, LearningProgram program)
    {
        if (u.Role != Role.learner) return true;
        if (program.Plan == "free") return true;
        var plan = EffectivePlan(u);
        if (plan == "premium") return true;
        if (plan == "pro") return program.Plan == "pro" && u.PlanTrack == program.Track;
        return false;
    }

    public static bool CanAccessLesson(UserProfile u, LearningProgram program, Lesson lesson, IEnumerable<Lesson> lessonsOfProgram)
        => PlanCoversProgram(u, program) || IsPreviewLesson(lesson, lessonsOfProgram);

    /// <summary>A plan request from the learner: pro/premium wait for an admin; free is live at once.</summary>
    public static void ApplyRequest(UserProfile u, string plan, string? planTrack, string note, string now)
    {
        if (!Plans.Contains(plan)) throw new ArgumentException("BAD_PLAN");
        u.Plan = plan;
        u.PlanStatus = plan == "free" ? "active" : "pending";
        u.PlanTrack = plan == "pro" ? (planTrack ?? u.Track) : null;
        u.PlanNote = note.Trim();
        u.PlanRequestedAt = plan == "free" ? null : now;
    }

    /// <summary>The admin's decision. An approved paid plan also lists the programs the learner should be joined to.</summary>
    public static IEnumerable<LearningProgram> ApplyDecision(UserProfile u, string plan, string status, string? planTrack, string note, IEnumerable<LearningProgram> tenantPrograms)
    {
        if (!Plans.Contains(plan)) throw new ArgumentException("BAD_PLAN");
        if (status is not ("active" or "pending" or "expired")) throw new ArgumentException("BAD_STATUS");
        u.Plan = plan;
        u.PlanStatus = plan == "free" ? "active" : status;
        u.PlanTrack = plan == "pro" ? (planTrack ?? u.Track) : null;
        u.PlanNote = note;
        if (status != "active" || plan == "free") return Enumerable.Empty<LearningProgram>();
        return tenantPrograms.Where(p => p.Published && (plan == "premium" || (p.Plan != "premium" && p.Track == u.PlanTrack)));
    }
}
