using System.Text.Json.Nodes;
using FluentAssertions;
using NUnit.Framework;
using QorstackReportService.Application.Projects.Transfer;

namespace QorstackReportService.Application.UnitTests.Projects;

/// <summary>Project export/import: decisions, manifest/ZIP validation and asset path rewriting.</summary>
[TestFixture]
public class ProjectTransferRulesTests
{
    [TestCase(1, null, false, "create", "new template")]
    [TestCase(3, null, true, "skip", "key belongs to another project")]
    [TestCase(4, 2, false, "update", "newer version (v2 → v4)")]
    [TestCase(2, 2, false, "skip", "already up to date")]
    [TestCase(1, 3, false, "skip", "target is newer (v3)")]
    public void Decide_FollowsTheImportRules(int source, int? target, bool otherProject, string action, string reason)
    {
        var (a, r) = ProjectTransferRules.Decide(source, target, otherProject);
        a.Should().Be(action);
        r.Should().Be(reason);
    }

    [Test]
    public void Decide_TargetInThisProjectWins_OverKeyInAnotherProject()
    {
        // Only templates of THIS project are updated; the other-project flag matters only when the key is absent here.
        ProjectTransferRules.Decide(5, 4, keyUsedByAnotherProject: true).Action.Should().Be(ImportAction.Update);
    }

    [Test]
    public void ValidateManifest_RejectsWrongFormatAndVersion()
    {
        ProjectTransferRules.ValidateManifest(null).Should().ContainSingle();
        ProjectTransferRules.ValidateManifest(new ProjectTransferManifest()).Should().BeEmpty();

        var wrong = new ProjectTransferManifest { Format = "something-else", FormatVersion = 2 };
        var errors = ProjectTransferRules.ValidateManifest(wrong);
        errors.Should().HaveCount(2);
        errors.Should().Contain(e => e.Contains("Unsupported export format version 2"));
    }

    [TestCase("templates/QOR-1/v1/template.docx", true)]
    [TestCase("manifest.json", true)]
    [TestCase("../evil.docx", false)]
    [TestCase("templates/../../etc/passwd", false)]
    [TestCase("/abs/path.docx", false)]
    [TestCase("C:/windows/x.docx", false)]
    [TestCase("templates\\k\\v1\\t.docx", false)]
    [TestCase("templates//t.docx", false)]
    [TestCase("templates/./t.docx", false)]
    public void IsSafeEntryName_BlocksZipSlip(string name, bool safe) =>
        ProjectTransferRules.IsSafeEntryName(name).Should().Be(safe);

    [Test]
    public void ValidateTemplateEntry_ChecksKeyFileTypeAndVersion()
    {
        var ok = new ManifestTemplate { Key = "QOR-1", Type = "word", Version = 2, FileName = "template.docx", Sha256 = "ab" };
        ProjectTransferRules.ValidateTemplateEntry(ok).Should().BeNull();

        ProjectTransferRules.ValidateTemplateEntry(new ManifestTemplate { Key = "../x", Type = "word", Version = 1, FileName = "t.docx", Sha256 = "a" })
            .Should().Be("invalid template key");
        ProjectTransferRules.ValidateTemplateEntry(new ManifestTemplate { Key = "k", Type = "word", Version = 0, FileName = "t.docx", Sha256 = "a" })
            .Should().Be("invalid version number");
        ProjectTransferRules.ValidateTemplateEntry(new ManifestTemplate { Key = "k", Type = "word", Version = 1, FileName = "t.exe", Sha256 = "a" })
            .Should().Be("file must be .docx or .xlsx");
        ProjectTransferRules.ValidateTemplateEntry(new ManifestTemplate { Key = "k", Type = "word", Version = 1, FileName = "t.xlsx", Sha256 = "a" })
            .Should().Contain("does not match");
        ProjectTransferRules.ValidateTemplateEntry(new ManifestTemplate { Key = "k", Type = "excel", Version = 1, FileName = "t.xlsx", Sha256 = "" })
            .Should().Be("missing checksum");
    }

    [Test]
    public void Sha256Hex_IsLowerCaseHex()
    {
        ProjectTransferRules.Sha256Hex("abc"u8.ToArray())
            .Should().Be("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    [Test]
    public void StoragePaths_AreFoundAndRewritten_EverywhereInThePayload()
    {
        var templateId = Guid.NewGuid();
        var own = $"minio:reports/sandbox-assets/{Guid.NewGuid()}/{templateId}/img_logo.png";
        var payload = $$"""
        { "image": { "logo": { "src": "{{own}}", "width": 120 } },
          "qrcode": { "pay": { "text": "x", "logo": "{{own}}" } },
          "replace": { "note": "minio-looking text is not a path" },
          "table": [{ "rows": [{ "img": "minio:reports/other/file.png" }] }] }
        """;

        var found = ProjectTransferRules.FindStoragePaths(payload);
        found.Should().BeEquivalentTo([own, "minio:reports/other/file.png"]);

        ProjectTransferRules.IsTemplateAsset(own, templateId).Should().BeTrue();
        ProjectTransferRules.IsTemplateAsset("minio:reports/other/file.png", templateId).Should().BeFalse();
        ProjectTransferRules.IsTemplateAsset($"minio:templates/sandbox-assets/u/{templateId}/x.png", templateId).Should().BeFalse();

        var rewritten = ProjectTransferRules.RewriteStoragePaths(payload, new Dictionary<string, string> { [own] = "minio:reports/sandbox-assets/new/t/img.png" });
        var json = JsonNode.Parse(rewritten!)!;
        json["image"]!["logo"]!["src"]!.GetValue<string>().Should().Be("minio:reports/sandbox-assets/new/t/img.png");
        json["qrcode"]!["pay"]!["logo"]!.GetValue<string>().Should().Be("minio:reports/sandbox-assets/new/t/img.png");
        json["image"]!["logo"]!["width"]!.GetValue<int>().Should().Be(120);
        json["table"]![0]!["rows"]![0]!["img"]!.GetValue<string>().Should().Be("minio:reports/other/file.png");
    }

    [Test]
    public void AssetFileName_IsPathSafeAndUnique()
    {
        var used = new HashSet<string>();
        var a = ProjectTransferRules.AssetFileName("minio:reports/sandbox-assets/u/t/../evil name.png", used);
        var b = ProjectTransferRules.AssetFileName("minio:reports/sandbox-assets/u/t2/evil name.png", used);
        ProjectTransferRules.IsSafeSegment(a).Should().BeTrue();
        a.Should().Be("evil_name.png");
        b.Should().Be("2-evil_name.png");
    }

    [TestCase("Customer Portal (prod)", "customer-portal-prod")]
    [TestCase("ระบบ", "project")]
    public void Slug_IsFileNameSafe(string name, string slug) =>
        ProjectTransferRules.Slug(name).Should().Be(slug);
}
