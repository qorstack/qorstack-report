using FluentAssertions;
using Microsoft.Extensions.Configuration;
using NUnit.Framework;
using QorstackReportService.Application.Common.Utilities;
using QorstackReportService.Application.Common.Webhooks;
using QorstackReportService.Application.Fonts.Queries.GetFontStatus;
using QorstackReportService.Infrastructure.Services.Font;

namespace QorstackReportService.Application.UnitTests.Storage;

/// <summary>Range parsing for /files, persisted webhook retries, and font sync status.</summary>
[TestFixture]
public class DeliveryRulesTests
{
    [TestCase(null, ByteRangeResult.Full, 0, 999)]
    [TestCase("", ByteRangeResult.Full, 0, 999)]
    [TestCase("bytes=0-99", ByteRangeResult.Partial, 0, 99)]
    [TestCase("bytes=500-", ByteRangeResult.Partial, 500, 999)]
    [TestCase("bytes=-100", ByteRangeResult.Partial, 900, 999)]
    [TestCase("bytes=-5000", ByteRangeResult.Partial, 0, 999)]
    [TestCase("bytes=900-5000", ByteRangeResult.Partial, 900, 999)]
    [TestCase("bytes=1000-", ByteRangeResult.NotSatisfiable, 0, 999)]
    [TestCase("bytes=0-1,5-9", ByteRangeResult.Full, 0, 999)]
    [TestCase("items=0-9", ByteRangeResult.Full, 0, 999)]
    [TestCase("bytes=9-3", ByteRangeResult.Full, 0, 999)]
    [TestCase("bytes=abc-", ByteRangeResult.Full, 0, 999)]
    public void ByteRange_ParsesSingleRanges(string? header, ByteRangeResult expected, long start, long end)
    {
        var result = ByteRange.Parse(header, 1000, out var s, out var e);

        result.Should().Be(expected);
        if (expected != ByteRangeResult.NotSatisfiable)
        {
            s.Should().Be(start);
            e.Should().Be(end);
        }
    }

    [Test]
    public void ByteRange_EmptyFile_IsAlwaysFull() =>
        ByteRange.Parse("bytes=0-10", 0, out _, out _).Should().Be(ByteRangeResult.Full);

    [Test]
    public void Webhook_SucceededAttempt_IsSent() =>
        WebhookRetryPolicy.Next(1, succeeded: true).Should().BeOfType<WebhookDeliveryOutcome.Sent>();

    [Test]
    public void Webhook_Failures_Retry10sThen60sThenGiveUp()
    {
        WebhookRetryPolicy.Next(1, false).Should().Be(new WebhookDeliveryOutcome.RetryAfter(TimeSpan.FromSeconds(10)));
        WebhookRetryPolicy.Next(2, false).Should().Be(new WebhookDeliveryOutcome.RetryAfter(TimeSpan.FromSeconds(60)));
        WebhookRetryPolicy.Next(3, false).Should().BeOfType<WebhookDeliveryOutcome.GiveUp>();
        WebhookRetryPolicy.Next(7, false).Should().BeOfType<WebhookDeliveryOutcome.GiveUp>();
    }

    [Test]
    public void FontStatus_Classification()
    {
        FontSyncStatus.Classify(false, true).Status.Should().Be(FontSyncStatus.Error);
        FontSyncStatus.Classify(false, null).Status.Should().Be(FontSyncStatus.Error);
        FontSyncStatus.Classify(true, true).Should().Be((FontSyncStatus.Ready, (string?)null));
        FontSyncStatus.Classify(true, false).Status.Should().Be(FontSyncStatus.Syncing);

        var unknown = FontSyncStatus.Classify(true, null);
        unknown.Status.Should().Be(FontSyncStatus.Ready);
        unknown.Message.Should().Contain("not confirmed");
    }

    [Test]
    public void FontRendererCache_FindsSyncedAndFlatFiles()
    {
        var synced = Directory.CreateTempSubdirectory("qr-fonts-synced").FullName;
        var flat = Directory.CreateTempSubdirectory("qr-fonts-flat").FullName;
        try
        {
            Directory.CreateDirectory(Path.Combine(synced, "abc"));
            File.WriteAllText(Path.Combine(synced, "abc", "Sarabun.ttf"), "x");
            File.WriteAllText(Path.Combine(flat, "Kanit.ttf"), "x");

            var cache = new FontRendererCache(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Fonts:RendererCachePath"] = synced,
                ["Gotenberg:FontsPath"] = flat
            }).Build());

            cache.IsConfigured.Should().BeTrue();
            cache.Contains("abc/Sarabun.ttf").Should().BeTrue();
            cache.Contains("def/Kanit.ttf").Should().BeTrue();   // flat fallback by file name
            cache.Contains("abc/Missing.ttf").Should().BeFalse();
            cache.Contains("../abc/Sarabun.ttf").Should().BeFalse();

            new FontRendererCache(new ConfigurationBuilder().Build()).IsConfigured.Should().BeFalse();
        }
        finally
        {
            Directory.Delete(synced, true);
            Directory.Delete(flat, true);
        }
    }
}
