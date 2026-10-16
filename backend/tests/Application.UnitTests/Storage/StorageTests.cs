using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NUnit.Framework;
using QorstackReportService.Infrastructure.Services.Storage;

namespace QorstackReportService.Application.UnitTests.Storage;

/// <summary>Download links (/files/{token}), storage config fallback, temp-download cleanup rule.</summary>
[TestFixture]
public class StorageTests
{
    private const string Secret = "unit-test-jwt-key-at-least-32-characters!";
    private static readonly DateTimeOffset Now = new(2026, 10, 7, 12, 0, 0, TimeSpan.Zero);

    private static FileUrlSigner Signer(string? publicUrl = "https://api.example.com") => new(Secret, publicUrl);

    // ── Tokens ───────────────────────────────────────────────────────────────

    [Test]
    public void Token_RoundTrips()
    {
        var signer = Signer();
        var token = signer.CreateToken("reports", "sandbox/u/t/v1.pdf", "Invoice 01.pdf", Now.AddHours(1));

        signer.TryRead(token, Now, out var file).Should().BeTrue();
        file.Should().Be(new FileToken("reports", "sandbox/u/t/v1.pdf", "Invoice 01.pdf", Now.AddHours(1).ToUnixTimeSeconds()));
    }

    [Test]
    public void Token_Expired_IsRejected()
    {
        var signer = Signer();
        var token = signer.CreateToken("reports", "a.pdf", null, Now.AddSeconds(-1));
        signer.TryRead(token, Now, out _).Should().BeFalse();
    }

    [Test]
    public void Token_TamperedPayload_IsRejected()
    {
        var signer = Signer();
        var token = signer.CreateToken("reports", "mine.pdf", null, Now.AddHours(1));
        var other = signer.CreateToken("templates", "someone-else.docx", null, Now.AddHours(1));
        // Swap the payload but keep the original signature.
        var forged = other.Split('.')[0] + "." + token.Split('.')[1];

        signer.TryRead(forged, Now, out _).Should().BeFalse();
    }

    [Test]
    public void Token_FromAnotherSecret_IsRejected()
    {
        var token = new FileUrlSigner("another-secret-another-secret-123456", null).CreateToken("reports", "a.pdf", null, Now.AddHours(1));
        Signer().TryRead(token, Now, out _).Should().BeFalse();
    }

    [TestCase("")]
    [TestCase("not-a-token")]
    [TestCase("abc.")]
    [TestCase(".abc")]
    [TestCase("!!!.???")]
    public void Token_Garbage_IsRejected(string token) =>
        Signer().TryRead(token, Now, out _).Should().BeFalse();

    [Test]
    public void Token_UnknownArea_IsRejected()
    {
        var signer = Signer();
        var token = signer.CreateToken("cmu-exam", "secret.pdf", null, Now.AddHours(1));
        signer.TryRead(token, Now, out _).Should().BeFalse();
    }

    [Test]
    public void BuildUrl_UsesPublicUrl()
    {
        Signer("https://api.example.com/").BuildUrl("abc.def").Should().Be("https://api.example.com/api/files/abc.def");
        Signer(null).BuildUrl("abc.def").Should().Be("/api/files/abc.def");
    }

    [Test]
    public void FileLink_MapsBackToStoragePath_EvenAfterExpiry()
    {
        var signer = Signer();
        var url = signer.BuildUrl(signer.CreateToken("reports", "sandbox-assets/u/t/img_logo.png", null, Now.AddSeconds(-60)));

        signer.TryConvertToStoragePath(url).Should().Be("minio:reports/sandbox-assets/u/t/img_logo.png");
        signer.TryConvertToStoragePath(url + "?v=2").Should().Be("minio:reports/sandbox-assets/u/t/img_logo.png");
        signer.TryConvertToStoragePath("https://evil.example/files/abc.def").Should().BeNull();
        signer.TryConvertToStoragePath("https://cdn.example.com/logo.png").Should().BeNull();
    }

    // ── Storage service: links + round trip ──────────────────────────────────

    [Test]
    public async Task StorageService_ReturnsApiLinks_AndConvertsThemBack()
    {
        var signer = Signer();
        var service = new MinioStorageService(
            Options.Create(new StorageSettings { Endpoint = "qorstack-storage:9000", AccessKey = "a", SecretKey = "secret-secret" }),
            signer,
            NullLogger<MinioStorageService>.Instance);

        var url = await service.GetPresignedUrlAsync("templates", "p1/t.docx", 600, "My \"report\".docx");

        url.Should().StartWith("https://api.example.com/api/files/");
        signer.TryRead(url["https://api.example.com/api/files/".Length..], DateTimeOffset.UtcNow, out var file).Should().BeTrue();
        file!.FileName.Should().Be("My report.docx");
        service.TryConvertToMinioPath(url).Should().Be("minio:templates/p1/t.docx");
    }

    [Test]
    public async Task StorageService_UnknownArea_Throws()
    {
        var service = new MinioStorageService(
            Options.Create(new StorageSettings { Endpoint = "s:9000", AccessKey = "a", SecretKey = "secret-secret" }),
            Signer(),
            NullLogger<MinioStorageService>.Instance);

        var act = () => service.GetPresignedUrlAsync("cmu-exam", "x.pdf");
        await act.Should().ThrowAsync<ArgumentException>();
    }

    // ── Config fallback ──────────────────────────────────────────────────────

    private static StorageSettings Bind(Dictionary<string, string?> values)
    {
        var settings = new StorageSettings();
        StorageSettings.Bind(settings, new ConfigurationBuilder().AddInMemoryCollection(values).Build());
        return settings;
    }

    [Test]
    public void Config_LegacyMinioSection_StillWorks()
    {
        var s = Bind(new() { ["Minio:Endpoint"] = "qorstack-minio:9000", ["Minio:AccessKey"] = "old", ["Minio:Bucket"] = "b1" });
        s.Endpoint.Should().Be("qorstack-minio:9000");
        s.AccessKey.Should().Be("old");
        s.Bucket.Should().Be("b1");
    }

    [Test]
    public void Config_StorageSection_WinsOverMinio()
    {
        var s = Bind(new()
        {
            ["Minio:Endpoint"] = "qorstack-minio:9000",
            ["Minio:SecretKey"] = "old-secret",
            ["Storage:Endpoint"] = "qorstack-storage:9000",
        });
        s.Endpoint.Should().Be("qorstack-storage:9000");
        s.SecretKey.Should().Be("old-secret"); // not set under Storage → falls back
    }

    [Test]
    public void Config_BlankValues_DoNotOverride()
    {
        var s = Bind(new() { ["Minio:Endpoint"] = "", ["Storage:Bucket"] = "", ["Minio:Bucket"] = "kept" });
        s.Endpoint.Should().Be("localhost:9000");
        s.Bucket.Should().Be("kept");
    }

    // ── Temp download cleanup ────────────────────────────────────────────────

    [Test]
    public void TempDownload_ExpiresAfterOneDay()
    {
        var now = new DateTime(2026, 10, 7, 12, 0, 0, DateTimeKind.Utc);
        TempDownloadCleanupService.IsExpired(now.AddHours(-25), now).Should().BeTrue();
        TempDownloadCleanupService.IsExpired(now.AddHours(-23), now).Should().BeFalse();
        TempDownloadCleanupService.IsExpired(null, now).Should().BeFalse();
    }
}
