using Ellp.Api.Shared;
using Ellp.Api.Shared.Data;
using Ellp.Api.Shared.Email;

namespace Ellp.Api.Modules.Inbox;

public interface IInboxService
{
    Task<InboxMessage> SendAsync(UserProfile me, string subject, string body, CancellationToken ct);
    Task<(MessageReply Reply, MailLog Mail)> ReplyAsync(UserProfile actor, string messageId, string body, CancellationToken ct);
}

/// <summary>Learners write to their owner's admins; an admin's reply is stored on the thread and emailed to the sender through the tenant's email settings.</summary>
public sealed class InboxService : IInboxService
{
    private readonly IEllpStore _s;
    private readonly IEmailService _mail;
    public InboxService(IEllpStore s, IEmailService mail) { _s = s; _mail = mail; }

    public async Task<InboxMessage> SendAsync(UserProfile me, string subject, string body, CancellationToken ct)
    {
        var m = new InboxMessage
        {
            Id = Clock.NewId("msg"), OwnerId = me.OwnerId ?? "", FromUid = me.Uid, FromName = me.DisplayName, FromEmail = me.Email,
            Subject = subject.Trim(), Body = body.Trim(), Status = "open", CreatedAt = Clock.NowIso(),
        };
        await _s.UpsertMessageAsync(m, ct);
        return m;
    }

    public async Task<(MessageReply, MailLog)> ReplyAsync(UserProfile actor, string messageId, string body, CancellationToken ct)
    {
        var m = await _s.MessageAsync(messageId, ct) ?? throw new KeyNotFoundException("MESSAGE_NOT_FOUND");
        var settings = await _s.SettingsAsync(m.OwnerId, ct);
        var html = $"<p>{System.Net.WebUtility.HtmlEncode(body.Trim()).Replace("\n", "<br>")}</p><hr><p style=\"color:#667\">{System.Net.WebUtility.HtmlEncode(m.Body)}</p>";
        var outcome = await _mail.SendAsync(new OutgoingMail(m.FromEmail, $"Re: {m.Subject}", html, settings.Email.ReplyTo), settings.Email, ct);
        var log = new MailLog { Id = Clock.NewId("mail"), OwnerId = m.OwnerId, To = m.FromEmail, Subject = $"Re: {m.Subject}", Body = body.Trim(), Status = outcome.Status, TestMode = settings.Email.TestMode, At = Clock.NowIso() };
        await _s.AddMailAsync(log, ct);
        var reply = new MessageReply { Id = Clock.NewId("rp"), ByUid = actor.Uid, ByName = actor.DisplayName, Body = body.Trim(), At = Clock.NowIso(), MailId = log.Id };
        m.Replies.Add(reply);
        m.Status = "answered";
        await _s.UpsertMessageAsync(m, ct);
        return (reply, log);
    }
}
