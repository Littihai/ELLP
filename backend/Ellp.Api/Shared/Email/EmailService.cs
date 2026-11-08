using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Ellp.Api.Shared;

namespace Ellp.Api.Shared.Email;

/// <summary>SMTP connection (server-wide). The password comes from the environment (EMAIL_PASSWORD), never from a tenant's settings.</summary>
public sealed class EmailOptions
{
    public string Host { get; set; } = "smtp.example.com";
    public int Port { get; set; } = 587;
    public string AuthUser { get; set; } = "";
    public string Password { get; set; } = "";
    public string Security { get; set; } = "auto";
    /// <summary>A server-wide safety switch over every tenant: while true no real mail leaves, whatever a tenant set.</summary>
    public bool GlobalTestMode { get; set; } = true;
    public int TimeoutSeconds { get; set; } = 15;
}

public sealed record OutgoingMail(string To, string Subject, string HtmlBody, string? ReplyTo);

/// <summary>What became of one message, as the mail log records it: sent | redirected | suppressed | failed.</summary>
public sealed record MailOutcome(string Status, string Detail);

public interface IEmailService
{
    Task<MailOutcome> SendAsync(OutgoingMail mail, EmailSettings tenant, CancellationToken ct);
}

/// <summary>
/// The test-mode guard, pure and testable (Ellp.Api.Tests/EmailGuardRulesTests.cs): in test mode a message goes to the
/// intended address only when it is on the allow-list; otherwise to the allow-list (redirected) or nowhere (suppressed).
/// </summary>
public static class EmailGuardRules
{
    public static (string Status, IReadOnlyList<string> To) Resolve(string intended, bool testMode, IReadOnlyList<string> allowed)
    {
        if (!testMode) return ("sent", new[] { intended });
        var allow = allowed.Where(a => !string.IsNullOrWhiteSpace(a)).Select(a => a.Trim()).ToList();
        if (allow.Count == 0) return ("suppressed", Array.Empty<string>());
        if (allow.Any(a => string.Equals(a, intended.Trim(), StringComparison.OrdinalIgnoreCase))) return ("sent", new[] { intended });
        return ("redirected", allow);
    }

    public static string TestSubject(string subject, string intended) => $"[TEST → {intended}] {subject}";
}

public sealed class SmtpEmailService : IEmailService
{
    private readonly EmailOptions _opt;
    private readonly ILogger<SmtpEmailService> _log;

    public SmtpEmailService(EmailOptions opt, ILogger<SmtpEmailService> log) { _opt = opt; _log = log; }

    public async Task<MailOutcome> SendAsync(OutgoingMail mail, EmailSettings tenant, CancellationToken ct)
    {
        var testMode = tenant.TestMode || _opt.GlobalTestMode;
        var (status, to) = EmailGuardRules.Resolve(mail.To, testMode, tenant.AllowedRecipients);
        if (to.Count == 0)
        {
            _log.LogWarning("Email suppressed (test mode, no allowed recipient): {Subject}", mail.Subject);
            return new MailOutcome("suppressed", "no allowed recipient");
        }
        try
        {
            var msg = new MimeMessage();
            msg.From.Add(new MailboxAddress(tenant.FromName, tenant.FromAddress));
            foreach (var a in to) if (MailboxAddress.TryParse(a, out var mb)) msg.To.Add(mb);
            if (msg.To.Count == 0) return new MailOutcome("failed", "no valid recipient address");
            if (!string.IsNullOrWhiteSpace(mail.ReplyTo) && MailboxAddress.TryParse(mail.ReplyTo, out var rt)) msg.ReplyTo.Add(rt);
            msg.Subject = status == "redirected" ? EmailGuardRules.TestSubject(mail.Subject, mail.To) : mail.Subject;
            msg.Body = new BodyBuilder { HtmlBody = mail.HtmlBody }.ToMessageBody();

            using var client = new SmtpClient { Timeout = Math.Clamp(_opt.TimeoutSeconds, 5, 120) * 1000 };
            await client.ConnectAsync(_opt.Host, _opt.Port, Security(_opt.Security), ct);
            if (!string.IsNullOrEmpty(_opt.AuthUser)) await client.AuthenticateAsync(_opt.AuthUser, _opt.Password, ct);
            await client.SendAsync(msg, ct);
            await client.DisconnectAsync(true, ct);
            _log.LogInformation("Email {Status} to {To}: {Subject}", status, string.Join(",", to), mail.Subject);
            return new MailOutcome(status, string.Join(",", to));
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Email failed: {Subject}", mail.Subject);
            return new MailOutcome("failed", ex.Message);
        }
    }

    private static SecureSocketOptions Security(string mode) => mode.Trim().ToLowerInvariant() switch
    {
        "starttls" => SecureSocketOptions.StartTls,
        "ssltls" or "ssl" or "tls" => SecureSocketOptions.SslOnConnect,
        "none" or "plain" => SecureSocketOptions.None,
        _ => SecureSocketOptions.Auto,
    };
}

/// <summary>Development: no SMTP; every message is logged and recorded as the guard decided, so the flow can be exercised without a mail server.</summary>
public sealed class LogOnlyEmailService : IEmailService
{
    private readonly ILogger<LogOnlyEmailService> _log;
    public LogOnlyEmailService(ILogger<LogOnlyEmailService> log) => _log = log;

    public Task<MailOutcome> SendAsync(OutgoingMail mail, EmailSettings tenant, CancellationToken ct)
    {
        var (status, to) = EmailGuardRules.Resolve(mail.To, true, tenant.AllowedRecipients);
        _log.LogInformation("[log-only email] {Status} → {To}: {Subject}", status, string.Join(",", to), mail.Subject);
        return Task.FromResult(new MailOutcome(status, "log-only"));
    }
}
