using FluentAssertions;
using NUnit.Framework;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Application.UnitTests.Web;

/// <summary>Which exported file serves a web path (web UI and API share one origin).</summary>
[TestFixture]
public class WebUiHostingTests
{
    // A miniature static export (trailingSlash: true)
    private static readonly HashSet<string> Files = new(StringComparer.OrdinalIgnoreCase)
    {
        "/index.html", "/index.txt", "/login/index.html", "/login/index.txt",
        "/project/_/index.html", "/project/_/index.txt",
        "/project/_/templates/index.html", "/project/_/templates/index.txt",
        "/pdf/templates/_/index.html", "/pdf/templates/create/index.html",
        "/excel/templates/_/index.html", "/_next/static/chunks/app.js"
    };

    private static string? Resolve(string path) => WebUiHosting.Resolve(path, Files.Contains);

    [TestCase("/", "/index.html")]
    [TestCase("/login", "/login/index.html")]
    [TestCase("/login/", "/login/index.html")]
    [TestCase("/project/4f2a", "/project/_/index.html")]
    [TestCase("/project/4f2a/templates", "/project/_/templates/index.html")]
    [TestCase("/project/4f2a/templates/", "/project/_/templates/index.html")]
    [TestCase("/pdf/templates/QOR-1234", "/pdf/templates/_/index.html")]
    [TestCase("/pdf/templates/create", "/pdf/templates/create/index.html")]
    [TestCase("/excel/templates/QOR-9", "/excel/templates/_/index.html")]
    [TestCase("/_next/static/chunks/app.js", "/_next/static/chunks/app.js")]
    public void Pages_ResolveToTheirExportedHtml(string path, string expected) =>
        Resolve(path).Should().Be(expected);

    [TestCase("/project/4f2a/index.txt", "/project/_/index.txt")]
    [TestCase("/project/4f2a.txt", "/project/_/index.txt")]
    [TestCase("/project/4f2a/templates/index.txt", "/project/_/templates/index.txt")]
    [TestCase("/login/index.txt", "/login/index.txt")]
    public void RscPayloads_UseTheSameMapping(string path, string expected) =>
        Resolve(path).Should().Be(expected);

    [TestCase("/api/templates")]
    [TestCase("/api/unknown/thing")]
    [TestCase("/nope")]
    [TestCase("/project")]
    [TestCase("/../appsettings.json")]
    public void ApiAndUnknownPaths_AreNotWebPages(string path) =>
        Resolve(path).Should().BeNull();
}
