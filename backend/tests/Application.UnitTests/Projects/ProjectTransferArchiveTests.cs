using System.IO.Compression;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using NUnit.Framework;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Projects.Transfer;

namespace QorstackReportService.Application.UnitTests.Projects;

/// <summary>Import ZIP checks with real in-memory archives.</summary>
[TestFixture]
public class ProjectTransferArchiveTests
{
    private static MemoryStream Zip(params (string Name, byte[] Data)[] files)
    {
        var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
            foreach (var (name, data) in files)
            {
                using var s = zip.CreateEntry(name).Open();
                s.Write(data);
            }
        ms.Position = 0;
        return ms;
    }

    private static byte[] Manifest(ProjectTransferManifest m) =>
        JsonSerializer.SerializeToUtf8Bytes(m, new JsonSerializerOptions(JsonSerializerDefaults.Web));

    private static Task<(Dictionary<string, ZipArchiveEntry>, ProjectTransferManifest)> Open(MemoryStream ms) =>
        ProjectTransferArchive.OpenAsync(new ZipArchive(ms, ZipArchiveMode.Read), 100 * 1024 * 1024, CancellationToken.None);

    [Test]
    public async Task ValidArchive_IsRead_AndFilesAreVerifiedBySha256()
    {
        var file = Encoding.UTF8.GetBytes("docx bytes");
        var manifest = new ProjectTransferManifest
        {
            Project = { Name = "Demo" },
            Templates = { new ManifestTemplate { Key = "QOR-1", Name = "Invoice", Type = "word", Version = 2, FileName = "template.docx", Sha256 = ProjectTransferRules.Sha256Hex(file) } }
        };
        using var ms = Zip(("manifest.json", Manifest(manifest)), ("templates/QOR-1/v2/template.docx", file));

        var (entries, read) = await Open(ms);

        read.Project.Name.Should().Be("Demo");
        read.Templates.Should().ContainSingle(t => t.Key == "QOR-1" && t.Version == 2);
        (await ProjectTransferArchive.ReadVerifiedAsync(entries, "templates/QOR-1/v2/template.docx", read.Templates[0].Sha256, default))
            .Should().Equal(file);
        (await ProjectTransferArchive.ReadVerifiedAsync(entries, "templates/QOR-1/v2/template.docx", new string('0', 64), default))
            .Should().BeNull("a checksum mismatch must not be imported");
        (await ProjectTransferArchive.ReadVerifiedAsync(entries, "templates/QOR-1/v9/template.docx", read.Templates[0].Sha256, default))
            .Should().BeNull();
    }

    [Test]
    public async Task UnknownFormatVersion_Is400()
    {
        using var ms = Zip(("manifest.json", Manifest(new ProjectTransferManifest { FormatVersion = 7 })));
        var act = () => Open(ms);
        (await act.Should().ThrowAsync<ValidationException>()).Which.Message.Should().Contain("Unsupported export format version 7");
    }

    [Test]
    public async Task ZipSlipEntry_Is400()
    {
        using var ms = Zip(("manifest.json", Manifest(new ProjectTransferManifest())), ("../../evil.docx", [1, 2, 3]));
        var act = () => Open(ms);
        (await act.Should().ThrowAsync<ValidationException>()).Which.Message.Should().Contain("unsafe path");
    }

    [Test]
    public async Task MissingOrBrokenManifest_Is400()
    {
        using (var ms = Zip(("templates/x/v1/t.docx", [1])))
            (await ((Func<Task>)(() => Open(ms))).Should().ThrowAsync<ValidationException>()).Which.Message.Should().Contain("manifest.json is missing");
        using (var ms = Zip(("manifest.json", "{ not json"u8.ToArray())))
            (await ((Func<Task>)(() => Open(ms))).Should().ThrowAsync<ValidationException>()).Which.Message.Should().Contain("not valid JSON");
    }

    [Test]
    public async Task OversizedExpansion_Is400()
    {
        using var ms = Zip(("manifest.json", Manifest(new ProjectTransferManifest())), ("big.bin", new byte[4096]));
        var act = () => ProjectTransferArchive.OpenAsync(new ZipArchive(ms, ZipArchiveMode.Read), 1024, CancellationToken.None);
        await act.Should().ThrowAsync<ValidationException>();
    }
}
