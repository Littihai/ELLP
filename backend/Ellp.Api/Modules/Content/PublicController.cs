using Microsoft.AspNetCore.Mvc;
using Ellp.Api.Shared;
using Ellp.Api.Shared.Api;
using Ellp.Api.Shared.Auth;
using Ellp.Api.Shared.Data;

namespace Ellp.Api.Modules.Content;

public sealed record PublicProgramRow(LearningProgram Program, Owner Owner, int LessonCount, Lesson? Preview);
public sealed record PublicProgramDetail(LearningProgram Program, Owner Owner, List<Lesson> Lessons, OwnerSettings Settings);
public sealed record ChatSendInput(string OwnerId, string? VisitorKey, string Name, string Email, string Text);

/// <summary>
/// What anyone may read without signing in (1.1): active providers, published programs with their preview lesson, one program's
/// details, and the visitor chat (a thread per visitor key, or per learner once signed in). Lesson quiz answers are stripped
/// from the public responses. Settings are reduced to what a visitor needs (LINE link, payment text).
/// </summary>
[ApiController]
[Route("api/v1/public")]
public sealed class PublicController : ControllerBase
{
    private readonly IEllpStore _s;
    private readonly ICurrentUser _me;
    public PublicController(IEllpStore s, ICurrentUser me) { _s = s; _me = me; }

    private static Lesson Strip(Lesson l) => new()
    {
        Id = l.Id, ProgramId = l.ProgramId, Order = l.Order, Title = l.Title, Summary = l.Summary, YoutubeId = l.YoutubeId, DurationSec = l.DurationSec,
        XpReward = l.XpReward, Vocabulary = l.Vocabulary, Published = l.Published, Unlock = l.Unlock,
        Quiz = l.Quiz.Select(q => new QuizQuestion { Id = q.Id, Prompt = q.Prompt, Choices = q.Choices, Answer = -1 }).ToList(),
    };

    private static OwnerSettings PublicSettings(OwnerSettings s) => new() { OwnerId = s.OwnerId, LineUrl = s.LineUrl, PaymentInstructions = s.PaymentInstructions, Leaderboard = s.Leaderboard, AgeRules = s.AgeRules };

    [HttpGet("owners")]
    public async Task<IActionResult> Owners(CancellationToken ct) => Ok(ApiResponse<List<Owner>>.Ok((await _s.OwnersAsync(ct)).Where(o => o.Active).ToList()));

    [HttpGet("programs")]
    public async Task<IActionResult> Programs(CancellationToken ct)
    {
        var owners = (await _s.OwnersAsync(ct)).Where(o => o.Active).ToDictionary(o => o.Id);
        var lessons = await _s.LessonsAsync(null, ct);
        var rows = (await _s.ProgramsAsync(null, ct)).Where(p => p.Published && owners.ContainsKey(p.OwnerId)).Select(p =>
        {
            var ls = lessons.Where(l => l.ProgramId == p.Id && l.Published).OrderBy(l => l.Order).ToList();
            return new PublicProgramRow(p, owners[p.OwnerId], ls.Count, ls.Count > 0 ? Strip(ls[0]) : null);
        }).ToList();
        return Ok(ApiResponse<List<PublicProgramRow>>.Ok(rows));
    }

    [HttpGet("programs/{id}")]
    public async Task<IActionResult> Program(string id, CancellationToken ct)
    {
        var p = (await _s.ProgramsAsync(null, ct)).FirstOrDefault(x => x.Id == id && x.Published);
        var owner = p is null ? null : await _s.OwnerAsync(p.OwnerId, ct);
        if (p is null || owner is null || !owner.Active) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "program not found"));
        var lessons = (await _s.LessonsAsync(id, ct)).Where(l => l.Published).OrderBy(l => l.Order).Select(Strip).ToList();
        return Ok(ApiResponse<PublicProgramDetail>.Ok(new PublicProgramDetail(p, owner, lessons, PublicSettings(await _s.SettingsAsync(owner.Id, ct)))));
    }

    [HttpGet("chat")]
    public async Task<IActionResult> Chat([FromQuery] string ownerId, [FromQuery] string? visitorKey, CancellationToken ct)
    {
        var me = await _me.GetAsync(ct);
        var c = await _s.FindChatAsync(ownerId, me?.Uid, me is null ? visitorKey : null, ct);
        return Ok(ApiResponse<ChatThread?>.Ok(c));
    }

    /// <summary>A visitor's or learner's message. Limits: 2,000 characters; a visitor needs a name and an email.</summary>
    [HttpPost("chat")]
    public async Task<IActionResult> Send([FromBody] ChatSendInput input, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(input.Text) || input.Text.Length > 2000) return BadRequest(ApiResponse<object>.Fail(ApiCodes.Validation, "text is required (max 2000)"));
        var owner = await _s.OwnerAsync(input.OwnerId, ct);
        if (owner is null || !owner.Active) return NotFound(ApiResponse<object>.Fail(ApiCodes.NotFound, "owner not found"));
        var me = await _me.GetAsync(ct);
        if (me is null && (string.IsNullOrWhiteSpace(input.Name) || string.IsNullOrWhiteSpace(input.Email) || string.IsNullOrWhiteSpace(input.VisitorKey)))
            return BadRequest(ApiResponse<object>.Fail(ApiCodes.Validation, "name, email and visitorKey are required"));
        var c = await _s.FindChatAsync(owner.Id, me?.Uid, me is null ? input.VisitorKey : null, ct);
        if (c is null)
        {
            c = new ChatThread { Id = Clock.NewId("chat"), OwnerId = owner.Id, Uid = me?.Uid, VisitorKey = me is null ? input.VisitorKey : null, Name = me?.DisplayName ?? input.Name.Trim(), Email = me?.Email ?? input.Email.Trim(), Status = "open", CreatedAt = Clock.NowIso(), UpdatedAt = Clock.NowIso() };
        }
        c.Messages.Add(new ChatMessage { Id = Clock.NewId("cm"), From = "visitor", ByName = c.Name, Text = input.Text.Trim(), At = Clock.NowIso() });
        c.UpdatedAt = Clock.NowIso();
        await _s.UpsertChatAsync(c, ct);
        return Ok(ApiResponse<ChatThread>.Ok(c));
    }
}
