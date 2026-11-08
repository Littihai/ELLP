using Ellp.Api.Modules.Access;
using Ellp.Api.Shared;

namespace Ellp.Api.Modules.Placement;

/// <summary>
/// Placement rules (1.4, decision 0008), the twin of frontend/src/lib/placement.ts. The test is a ladder: the person is
/// placed at the highest CEFR level they pass when every lower level is passed too.
/// </summary>
public static class PlacementRules
{
    public const int LevelPassPct = 60;
    public const int MaxRecommended = 3;
    public static readonly string[] Skills = { "listening", "speaking", "reading", "writing", "grammar", "vocabulary" };

    public static int CefrIndex(string cefr) => Array.IndexOf(PlanRules.Cefr, cefr);

    public sealed record PlacementScore(int Raw, int Total, List<LevelScore> ByLevel, List<SkillScore> BySkill, string Cefr);

    public static PlacementScore Score(PlacementTest test, IReadOnlyDictionary<string, int> answers)
    {
        bool Right(PlacementQuestion q) => answers.TryGetValue(q.Id, out var a) && a == q.Answer;
        var byLevel = PlanRules.Cefr.Select(c => (c, qs: test.Questions.Where(q => q.Cefr == c).ToList())).Where(x => x.qs.Count > 0)
            .Select(x => new LevelScore { Cefr = x.c, Raw = x.qs.Count(Right), Total = x.qs.Count }).ToList();
        var bySkill = Skills.Select(s => (s, qs: test.Questions.Where(q => q.Skill == s).ToList())).Where(x => x.qs.Count > 0)
            .Select(x => new SkillScore { Skill = x.s, Raw = x.qs.Count(Right), Total = x.qs.Count }).ToList();
        return new PlacementScore(test.Questions.Count(Right), test.Questions.Count, byLevel, bySkill, PlaceOnLadder(byLevel));
    }

    /// <summary>Walk the levels from the lowest; the placement is the last level passed before the first one failed. pre-A1 when none.</summary>
    public static string PlaceOnLadder(IEnumerable<LevelScore> byLevel)
    {
        var placed = "pre-A1";
        foreach (var level in byLevel.OrderBy(l => CefrIndex(l.Cefr)))
        {
            if (level.Total == 0) continue;
            if ((double)level.Raw / level.Total * 100 >= LevelPassPct) placed = level.Cefr; else break;
        }
        return placed;
    }

    /// <summary>Published programs at the placed level or one above, the person's track first when it has a match; else the nearest. At most three.</summary>
    public static List<string> RecommendPrograms(string cefr, IEnumerable<LearningProgram> programs, string? track)
    {
        var pub = programs.Where(p => p.Published).ToList();
        var idx = CefrIndex(cefr);
        int Dist(LearningProgram p) => CefrIndex(p.Cefr) - idx;
        var pool = track is not null && pub.Any(p => p.Track == track) ? pub.Where(p => p.Track == track).ToList() : pub;
        var fit = pool.Where(p => Dist(p) is 0 or 1).OrderBy(Dist).ThenBy(p => p.CreatedAt, StringComparer.Ordinal).ToList();
        var chosen = fit.Count > 0 ? fit : pool.OrderBy(p => Math.Abs(Dist(p))).ThenBy(p => p.CreatedAt, StringComparer.Ordinal).ToList();
        return chosen.Take(MaxRecommended).Select(p => p.Id).ToList();
    }

    /// <summary>What a visitor or learner receives: the test without its answer key.</summary>
    public static PlacementTest Strip(PlacementTest t) => new()
    {
        Id = t.Id, OwnerId = t.OwnerId, Title = t.Title, Description = t.Description, Published = t.Published,
        Questions = t.Questions.Select(q => new PlacementQuestion { Id = q.Id, Skill = q.Skill, Cefr = q.Cefr, Prompt = q.Prompt, Choices = q.Choices, Answer = -1 }).ToList(),
    };
}
