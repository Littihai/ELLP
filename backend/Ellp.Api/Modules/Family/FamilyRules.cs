using System.Globalization;
using Ellp.Api.Shared;
using static Ellp.Api.Modules.Progress.GamificationRules;

namespace Ellp.Api.Modules.Family;

/// <summary>
/// The skill profile, parent access and the weekly report (1.4, decision 0008), the twin of frontend/src/lib/skills.ts and
/// lib/family.ts. Pure functions; the controller gathers the rows and the email service sends the text.
/// </summary>
public static class FamilyRules
{
    public static readonly string[] Skills = { "listening", "speaking", "reading", "writing", "grammar", "vocabulary" };

    /// <summary>The skill names, the same words in the pages and in the weekly email.</summary>
    public static readonly Dictionary<string, Text2> SkillNames = new()
    {
        ["listening"] = new("การฟัง", "Listening"), ["speaking"] = new("การพูด", "Speaking"), ["reading"] = new("การอ่าน", "Reading"),
        ["writing"] = new("การเขียน", "Writing"), ["grammar"] = new("ไวยากรณ์", "Grammar"), ["vocabulary"] = new("คำศัพท์", "Vocabulary"),
    };

    /// <summary>A parent reads a child when the child is a learner of the same tenant listed in the parent's ChildUids.</summary>
    public static bool CanViewChild(UserProfile parent, UserProfile child)
        => parent.Role == Role.parent && child.Role == Role.learner && parent.OwnerId is not null && parent.OwnerId == child.OwnerId && parent.ChildUids.Contains(child.Uid);

    public static List<SkillProfileRow> SkillProfile(IEnumerable<Lesson> lessons, IEnumerable<LessonProgress> progress)
    {
        var ls = lessons.Where(l => l.Published).ToList();
        var byLesson = progress.GroupBy(p => p.LessonId).ToDictionary(g => g.Key, g => g.First());
        return Skills.Select(skill =>
        {
            var mine = ls.Where(l => l.Skills.Contains(skill)).ToList();
            var rows = mine.Select(l => byLesson.GetValueOrDefault(l.Id)).Where(p => p is not null).Select(p => p!).ToList();
            var done = rows.Count(p => p.Completed);
            var correct = rows.Sum(p => p.QuizScore ?? 0);
            var total = rows.Sum(p => p.QuizTotal ?? 0);
            return new SkillProfileRow
            {
                Skill = skill, LessonsDone = done, LessonsTotal = mine.Count, QuizCorrect = correct, QuizTotal = total,
                Pct = mine.Count > 0 ? (int)Math.Round(done * 100.0 / mine.Count) : 0,
                Accuracy = total > 0 ? (int)Math.Round(correct * 100.0 / total) : null,
            };
        }).ToList();
    }

    public static (string? Strongest, string? Weakest) StrongestWeakest(IEnumerable<SkillProfileRow> rows)
    {
        var live = rows.Where(r => r.LessonsTotal > 0).ToList();
        if (live.Count == 0) return (null, null);
        static int Score(SkillProfileRow r) => r.Pct * 1000 + (r.Accuracy ?? 0);
        var sorted = live.OrderByDescending(Score).ToList();
        var strongest = sorted[0]; var weakest = sorted[^1];
        if (live.Count == 1 || Score(strongest) == Score(weakest)) return (strongest.Skill, null);
        return (strongest.Skill, weakest.Skill);
    }

    /// <summary>Monday and Sunday of an ISO week key such as 2026-W45, as yyyy-MM-dd.</summary>
    public static (string From, string To) WeekRange(string key)
    {
        var parts = key.Split("-W");
        if (parts.Length != 2 || !int.TryParse(parts[0], out var year) || !int.TryParse(parts[1], out var week)) return (key, key);
        var jan4 = new DateTime(year, 1, 4);
        var dow = (int)jan4.DayOfWeek; if (dow == 0) dow = 7;
        var monday = jan4.AddDays(-(dow - 1) + (week - 1) * 7);
        return (monday.ToString("yyyy-MM-dd"), monday.AddDays(6).ToString("yyyy-MM-dd"));
    }

    public static List<string> RecentWeeks(int back, DateTime now) => Enumerable.Range(0, back + 1).Select(i => WeekKey(now.AddDays(-7 * i))).ToList();

    private static DateTime At(string iso) => DateTime.Parse(iso, null, DateTimeStyles.RoundtripKind);

    public static WeeklyReport BuildWeeklyReport(UserProfile child, List<Lesson> lessons, List<LessonProgress> progress, List<XpEvent> events, string key)
    {
        bool InWeek(string? iso) => iso is not null && WeekKey(At(iso)) == key;
        var weekEvents = events.Where(e => e.Uid == child.Uid && InWeek(e.At)).ToList();
        var mine = progress.Where(p => p.Uid == child.Uid).ToList();
        var touched = mine.Where(p => InWeek(p.UpdatedAt) || InWeek(p.CompletedAt)).ToList();
        Lesson? LessonOf(string id) => lessons.FirstOrDefault(l => l.Id == id);
        var seconds = touched.Sum(p => { var l = LessonOf(p.LessonId); return p.Completed && InWeek(p.CompletedAt) ? (double)(l?.DurationSec ?? 0) : Math.Min(p.WatchedSec, l?.DurationSec ?? p.WatchedSec); });
        var skills = SkillProfile(lessons, mine);
        var (strongest, weakest) = StrongestWeakest(skills);
        var (from, to) = WeekRange(key);
        var r = new WeeklyReport
        {
            Uid = child.Uid, WeekKey = key, From = from, To = to,
            Xp = weekEvents.Sum(e => e.Xp),
            LessonsDone = mine.Count(p => p.Completed && InWeek(p.CompletedAt)),
            QuizzesPassed = touched.Count(p => p.QuizScore is not null && p.QuizTotal is not null && QuizPassed(p.QuizScore.Value, p.QuizTotal.Value, QuizPassPct)),
            ActiveDays = weekEvents.Select(e => DayKey(At(e.At))).Distinct().Count(),
            Minutes = (int)Math.Round(seconds / 60),
            Level = LevelFor(child.Xp), StreakDays = child.StreakDays,
            Skills = skills, Strongest = strongest, Weakest = weakest,
        };
        r.Summary = Summarize(child.DisplayName, r);
        return r;
    }

    /// <summary>The plain sentences of the report from the numbers only; the same text the frontend shows.</summary>
    public static Text2 Summarize(string name, WeeklyReport r)
    {
        if (r.Xp == 0 && r.LessonsDone == 0)
            return new($"สัปดาห์นี้ {name} ยังไม่ได้เข้าเรียน ลองชวนดูวิดีโอสั้น ๆ สัก 1 บทด้วยกันนะคะ", $"{name} did not learn this week. A short video together is an easy restart.");
        var th = new List<string> { $"สัปดาห์นี้ {name} เข้าเรียน {r.ActiveDays} วัน รวมประมาณ {r.Minutes} นาที จบ {r.LessonsDone} บท และได้ {r.Xp} XP" };
        var en = new List<string> { $"This week {name} learned on {r.ActiveDays} day(s), about {r.Minutes} minutes, finished {r.LessonsDone} lesson(s) and earned {r.Xp} XP." };
        if (r.Strongest is not null) { th.Add($"ทำได้ดีที่สุดด้าน{SkillNames[r.Strongest].Th}"); en.Add($"Strongest skill: {SkillNames[r.Strongest].En}."); }
        if (r.Weakest is not null) { th.Add($"ส่วนที่ควรฝึกเพิ่มคือ{SkillNames[r.Weakest].Th}"); en.Add($"Worth more practice: {SkillNames[r.Weakest].En}."); }
        if (r.StreakDays >= 3) { th.Add($"เรียนต่อเนื่อง {r.StreakDays} วันแล้ว เยี่ยมมาก"); en.Add($"A {r.StreakDays}-day streak, well done."); }
        return new(string.Join(" ", th), string.Join(" ", en));
    }
}
