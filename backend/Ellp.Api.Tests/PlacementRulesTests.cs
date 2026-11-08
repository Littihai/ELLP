using Ellp.Api.Modules.Placement;
using Ellp.Api.Shared;

namespace Ellp.Api.Tests;

/// <summary>The placement ladder and the recommendations (decision 0008), the twin of frontend/src/lib/placement.ts.</summary>
public class PlacementRulesTests
{
    private static PlacementQuestion Q(string id, string skill, string cefr, int answer = 0) => new() { Id = id, Skill = skill, Cefr = cefr, Answer = answer, Choices = new() { "a", "b", "c" } };

    private static readonly PlacementTest Test = new()
    {
        Questions = new()
        {
            Q("a1", "grammar", "A1"), Q("a2", "vocabulary", "A1"), Q("a3", "reading", "A1"),
            Q("b1", "grammar", "A2"), Q("b2", "vocabulary", "A2"), Q("b3", "listening", "A2"),
            Q("c1", "grammar", "B1"), Q("c2", "reading", "B1"), Q("c3", "vocabulary", "B1"),
            Q("d1", "grammar", "B2"), Q("d2", "vocabulary", "B2"), Q("d3", "reading", "B2"),
        },
    };

    private static Dictionary<string, int> Right(params string[] ids) => ids.ToDictionary(i => i, _ => 0);

    [Fact]
    public void The_ladder_places_at_the_last_level_passed_in_a_row()
    {
        var sc = PlacementRules.Score(Test, Right("a1", "a2", "a3", "b1", "b2", "b3", "c1", "c2", "c3", "d1"));
        Assert.Equal("B1", sc.Cefr);
        Assert.Equal((10, 12), (sc.Raw, sc.Total));
        Assert.Equal(new[] { "A1", "A2", "B1", "B2" }, sc.ByLevel.Select(l => l.Cefr));
        Assert.Equal(new[] { 3, 3, 3, 1 }, sc.ByLevel.Select(l => l.Raw));
    }

    [Fact]
    public void Two_of_three_passes_a_level_but_a_gap_stops_the_climb()
    {
        Assert.Equal("A2", PlacementRules.Score(Test, Right("a1", "a2", "b1", "b2", "c1")).Cefr);                  // 2/3, 2/3, 1/3 → A2
        Assert.Equal("A1", PlacementRules.Score(Test, Right("a1", "a2", "a3", "b1", "c1", "c2", "c3", "d1", "d2", "d3")).Cefr);   // A2 failed: the B1 and B2 passes do not count
        Assert.Equal("pre-A1", PlacementRules.Score(Test, new Dictionary<string, int>()).Cefr);
        Assert.Equal("B2", PlacementRules.Score(Test, Right("a1", "a2", "a3", "b1", "b2", "b3", "c1", "c2", "c3", "d1", "d2", "d3")).Cefr);
    }

    [Fact]
    public void Skill_scores_add_up_across_levels()
    {
        var sc = PlacementRules.Score(Test, Right("a1", "b1", "c1", "d1", "a2"));
        var grammar = sc.BySkill.Single(s => s.Skill == "grammar");
        Assert.Equal((4, 4), (grammar.Raw, grammar.Total));
        var vocab = sc.BySkill.Single(s => s.Skill == "vocabulary");
        Assert.Equal((1, 4), (vocab.Raw, vocab.Total));
        Assert.DoesNotContain(sc.BySkill, s => s.Skill == "writing");   // no question, no row
    }

    private static LearningProgram P(string id, string cefr, string track, bool published = true, string created = "2026-10-01") => new() { Id = id, Cefr = cefr, Track = track, Published = published, CreatedAt = created };

    [Fact]
    public void Recommendations_prefer_the_level_and_the_next_in_the_persons_track()
    {
        var programs = new[] { P("found", "A1", "foundation"), P("tgat", "B1", "school"), P("toeic", "B1", "toeic"), P("ielts", "B2", "ielts"), P("draft", "B1", "school", published: false), P("kpo", "A2", "kpo") };
        Assert.Equal(new[] { "tgat" }, PlacementRules.RecommendPrograms("B1", programs, "school"));                      // the track has a fit: only it
        Assert.Equal(new[] { "tgat", "toeic", "ielts" }, PlacementRules.RecommendPrograms("B1", programs, null));      // no track: level first, then one above, by creation
        Assert.Equal(new[] { "found" }, PlacementRules.RecommendPrograms("pre-A1", programs, "kids"));           // the kids track has nothing: everybody; pre-A1 or A1 fits, so only the A1 program
    }

    [Fact]
    public void Recommendations_fall_back_to_the_nearest_level()
    {
        var programs = new[] { P("ielts", "B2", "ielts"), P("found", "A1", "foundation") };
        Assert.Equal(new[] { "ielts", "found" }, PlacementRules.RecommendPrograms("C1", programs, null));
        Assert.Empty(PlacementRules.RecommendPrograms("A1", Array.Empty<LearningProgram>(), null));
    }

    [Fact]
    public void A_stripped_test_keeps_no_answers()
    {
        var s = PlacementRules.Strip(Test);
        Assert.All(s.Questions, q => Assert.Equal(-1, q.Answer));
        Assert.Equal(Test.Questions.Count, s.Questions.Count);
        Assert.Equal(0, Test.Questions[0].Answer);   // the original is untouched
    }
}
