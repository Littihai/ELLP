using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Ellp.Api.Shared;

namespace Ellp.Api.Modules.Commerce;

/// <summary>Keys for Omise / Opn Payments (OMISE_SECRET_KEY, OMISE_PUBLIC_KEY in the environment). Empty = the provider is not configured.</summary>
public sealed class OmiseOptions
{
    public string SecretKey { get; set; } = "";
    public string PublicKey { get; set; } = "";
    public string ApiBase { get; set; } = "https://api.omise.co";
    /// <summary>Where the provider calls back; set to the public URL of /api/v1/payments/webhook/omise.</summary>
    public string WebhookUrl { get; set; } = "";
}

/// <summary>What the gateway gives back when a checkout is created: the provider's charge id and what the browser should show.</summary>
public sealed record CheckoutResult(string Reference, string? QrPayload, string? RedirectUrl);

/// <summary>
/// The payment door (1.3, decision 0007). The demo gateway invents a charge and lets the learner "simulate" the webhook;
/// the Omise gateway creates a PromptPay source and charge and is confirmed by Omise's webhook (charge.complete).
/// Both implement the same interface, so the controller does not care which one the tenant chose.
/// </summary>
public interface IPaymentGateway
{
    string Provider { get; }
    Task<CheckoutResult> CreateCheckoutAsync(Payment pay, UserProfile learner, CancellationToken ct);
    /// <summary>Re-read the charge from the provider; true when it is paid. Used by the webhook handler so a forged call cannot mark a payment paid.</summary>
    Task<bool> IsPaidAsync(string reference, CancellationToken ct);
}

public sealed class DemoGateway : IPaymentGateway
{
    public string Provider => "demo";
    public Task<CheckoutResult> CreateCheckoutAsync(Payment pay, UserProfile learner, CancellationToken ct)
    {
        var reference = $"chrg_demo_{Guid.NewGuid():N}"[..24];
        var qr = pay.Method == "promptpay" ? $"00020101021230370016A000000677010111{reference[^8..]}5303764540{pay.Amount:0.00}5802TH6304DEMO" : null;
        return Task.FromResult(new CheckoutResult(reference, qr, pay.Method == "card" ? $"/app/plan?demoCard={reference}" : null));
    }
    /// <summary>The demo has no provider to ask; the controller's demo-confirm endpoint (Development only) settles it.</summary>
    public Task<bool> IsPaidAsync(string reference, CancellationToken ct) => Task.FromResult(false);
}

/// <summary>
/// Omise (Opn Payments): PromptPay through a `source` of type promptpay and a `charge`; card through a token the browser creates
/// with Omise.js and the public key (the card number never reaches this server). Not exercised against a live account in 1.3.
/// </summary>
public sealed class OmiseGateway : IPaymentGateway
{
    private readonly HttpClient _http;
    private readonly OmiseOptions _opt;
    private readonly ILogger<OmiseGateway> _log;
    public string Provider => "omise";

    public OmiseGateway(HttpClient http, OmiseOptions opt, ILogger<OmiseGateway> log)
    {
        _http = http; _opt = opt; _log = log;
        _http.BaseAddress = new Uri(_opt.ApiBase);
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_opt.SecretKey}:")));
    }

    public async Task<CheckoutResult> CreateCheckoutAsync(Payment pay, UserProfile learner, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_opt.SecretKey)) throw new InvalidOperationException("OMISE_NOT_CONFIGURED");
        var satang = pay.Amount * 100;
        if (pay.Method == "promptpay")
        {
            var source = await PostAsync("/sources", new Dictionary<string, string> { ["type"] = "promptpay", ["amount"] = satang.ToString(), ["currency"] = "THB" }, ct);
            var sourceId = source.GetProperty("id").GetString()!;
            var charge = await PostAsync("/charges", new Dictionary<string, string> { ["amount"] = satang.ToString(), ["currency"] = "THB", ["source"] = sourceId, ["description"] = $"ELLP {pay.Plan} {pay.Id}", ["metadata[paymentId]"] = pay.Id, ["metadata[uid]"] = learner.Uid }, ct);
            var qr = charge.GetProperty("source").GetProperty("scannable_code").GetProperty("image").GetProperty("download_uri").GetString();
            return new CheckoutResult(charge.GetProperty("id").GetString()!, qr, null);
        }
        // card: the browser tokenises with Omise.js; the charge is created when the token arrives (POST /me/checkout with cardToken)
        return new CheckoutResult($"pending_card_{pay.Id}", null, null);
    }

    public async Task<bool> IsPaidAsync(string reference, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_opt.SecretKey) || !reference.StartsWith("chrg_")) return false;
        var res = await _http.GetAsync($"/charges/{reference}", ct);
        if (!res.IsSuccessStatusCode) { _log.LogWarning("Omise charge {Ref} lookup failed: {Status}", reference, res.StatusCode); return false; }
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
        return doc.RootElement.TryGetProperty("paid", out var paid) && paid.GetBoolean();
    }

    private async Task<JsonElement> PostAsync(string path, Dictionary<string, string> form, CancellationToken ct)
    {
        var res = await _http.PostAsync(path, new FormUrlEncodedContent(form), ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode) { _log.LogError("Omise {Path} failed: {Body}", path, body); throw new InvalidOperationException("OMISE_FAILED"); }
        return JsonDocument.Parse(body).RootElement.Clone();
    }
}

/// <summary>Transfer only: no gateway. A checkout with method "transfer" needs no provider call.</summary>
public sealed class ManualGateway : IPaymentGateway
{
    public string Provider => "manual";
    public Task<CheckoutResult> CreateCheckoutAsync(Payment pay, UserProfile learner, CancellationToken ct) => Task.FromResult(new CheckoutResult(pay.Reference, null, null));
    public Task<bool> IsPaidAsync(string reference, CancellationToken ct) => Task.FromResult(false);
}

/// <summary>Picks the gateway a tenant configured.</summary>
public sealed class GatewayDirectory
{
    private readonly Dictionary<string, IPaymentGateway> _byName;
    public GatewayDirectory(IEnumerable<IPaymentGateway> gateways) => _byName = gateways.ToDictionary(g => g.Provider);
    public IPaymentGateway For(string provider) => _byName.TryGetValue(provider, out var g) ? g : _byName["demo"];
}
