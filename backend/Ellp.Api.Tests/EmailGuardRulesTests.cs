using Ellp.Api.Shared.Email;

namespace Ellp.Api.Tests;

/// <summary>Test mode must never let a message reach a real parent's inbox by accident.</summary>
public class EmailGuardRulesTests
{
    [Fact]
    public void Live_mode_sends_to_the_intended_address()
    {
        var (status, to) = EmailGuardRules.Resolve("parent@example.com", testMode: false, Array.Empty<string>());
        Assert.Equal("sent", status);
        Assert.Equal(new[] { "parent@example.com" }, to);
    }

    [Fact]
    public void Test_mode_without_an_allow_list_suppresses()
    {
        var (status, to) = EmailGuardRules.Resolve("parent@example.com", true, new[] { " " });
        Assert.Equal("suppressed", status);
        Assert.Empty(to);
    }

    [Fact]
    public void Test_mode_redirects_to_the_allow_list()
    {
        var (status, to) = EmailGuardRules.Resolve("parent@example.com", true, new[] { "qa@school.example" });
        Assert.Equal("redirected", status);
        Assert.Equal(new[] { "qa@school.example" }, to);
    }

    [Fact]
    public void Test_mode_delivers_when_the_intended_address_is_allowed_whatever_the_case()
    {
        var (status, to) = EmailGuardRules.Resolve("QA@School.example", true, new[] { "qa@school.example" });
        Assert.Equal("sent", status);
        Assert.Single(to);
    }

    [Fact]
    public void A_redirected_subject_names_the_intended_recipient() =>
        Assert.Equal("[TEST → parent@example.com] Re: hello", EmailGuardRules.TestSubject("Re: hello", "parent@example.com"));
}
