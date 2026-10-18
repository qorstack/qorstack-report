using FluentAssertions;
using NUnit.Framework;
using QorstackReportService.Application.Auth;

namespace QorstackReportService.Application.UnitTests.Auth;

/// <summary>Sign-in cookie flags: HTTPS installs, plain-HTTP installs (NodePort), localhost, and the override.</summary>
[TestFixture]
public class AuthCookiePolicyTests
{
    [Test]
    public void BrowserOnHttps_GetsSecureCookies_EvenWhenAProxyTalksHttpToUs()
    {
        AuthCookiePolicy.Resolve(null, browserHttps: true, isLocalhost: false, isHttps: false).Should().Be((true, false));
    }

    [Test]
    public void BrowserOnPlainHttp_GetsCookiesItCanKeep_NodePortOrIntranetIp()
    {
        AuthCookiePolicy.Resolve(null, browserHttps: false, isLocalhost: false, isHttps: false).Should().Be((false, true));
    }

    // No Origin/Referer (API clients): the rule of earlier versions.
    [TestCase(false, true, true, false, TestName = "Unknown page, HTTPS domain → Secure, None")]
    [TestCase(false, false, true, false, TestName = "Unknown page, HTTP domain → Secure, None")]
    [TestCase(true, false, false, true, TestName = "Unknown page, http://localhost → not Secure, Lax")]
    [TestCase(true, true, true, false, TestName = "Unknown page, https://localhost → Secure, None")]
    public void UnknownPage_KeepsTheBehaviourOfEarlierVersions(bool isLocalhost, bool isHttps, bool secure, bool lax)
    {
        AuthCookiePolicy.Resolve(null, null, isLocalhost, isHttps).Should().Be((secure, lax));
    }

    [TestCase(true)]
    [TestCase(false)]
    [TestCase(null)]
    public void Setting_WinsOverWhatTheBrowserSends(bool? browserHttps)
    {
        AuthCookiePolicy.Resolve(false, browserHttps, false, true).Should().Be((false, true));
        AuthCookiePolicy.Resolve(true, browserHttps, false, false).Should().Be((true, false));
    }

    [TestCase("https://report.example.com", null, true)]
    [TestCase("http://10.0.0.5:30080", null, false)]
    [TestCase(null, "http://10.0.0.5:30080/login", false)]
    [TestCase("null", "https://report.example.com/project/x", true)]
    [TestCase("https://a.example.com", "http://b.example.com/", true)]
    [TestCase(null, null, null)]
    [TestCase("", "not a url", null)]
    public void BrowserIsHttps_ReadsOriginThenReferer(string? origin, string? referer, bool? expected)
    {
        AuthCookiePolicy.BrowserIsHttps(origin, referer).Should().Be(expected);
    }

    [TestCase("false", false)]
    [TestCase(" FALSE ", false)]
    [TestCase("True", true)]
    [TestCase("", null)]
    [TestCase(null, null)]
    [TestCase("auto", null)]
    public void Parse_ReadsTrueFalse_AndTreatsAnythingElseAsUnset(string? value, bool? expected)
    {
        AuthCookiePolicy.Parse(value).Should().Be(expected);
    }
}
