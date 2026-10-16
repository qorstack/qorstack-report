using System.Text.Json;
using FluentAssertions;
using NUnit.Framework;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Reports.Commands;
using QorstackReportService.Application.Reports.Commands.ExportExcel;
using QorstackReportService.Application.Reports.Commands.ExportPdf;
using QorstackReportService.Application.Reports.Commands.QueueRender;

namespace QorstackReportService.Application.UnitTests.Reports;

/// <summary>Postgres render queue: retry/backoff decisions, claim eligibility, payload round-trip.</summary>
[TestFixture]
public class RenderQueueRulesTests
{
    private static readonly DateTime Now = new(2026, 10, 7, 12, 0, 0, DateTimeKind.Utc);

    // ── Retry / backoff ──────────────────────────────────────────────────────

    [Test]
    public void TransientError_FirstAttempt_RetriesAfter10Seconds() =>
        RenderRetryPolicy.Decide(1, 3, new HttpRequestException("gotenberg down"))
            .Should().Be(new RenderRetryDecision.Retry(TimeSpan.FromSeconds(10)));

    [Test]
    public void TransientError_SecondAttempt_RetriesAfter60Seconds() =>
        RenderRetryPolicy.Decide(2, 3, new TimeoutException())
            .Should().Be(new RenderRetryDecision.Retry(TimeSpan.FromSeconds(60)));

    [Test]
    public void TransientError_LastAttempt_Fails() =>
        RenderRetryPolicy.Decide(3, 3, new HttpRequestException("still down")).Should().BeOfType<RenderRetryDecision.Fail>();

    [Test]
    public void TransientInnerError_IsRetried() =>
        RenderRetryPolicy.Decide(1, 3, new InvalidOperationException("wrap", new HttpRequestException("x")))
            .Should().BeOfType<RenderRetryDecision.Retry>();

    [Test]
    public void ValidationError_FailsAtOnce() =>
        RenderRetryPolicy.Decide(1, 3, new ValidationException("bad request")).Should().BeOfType<RenderRetryDecision.Fail>();

    [Test]
    public void MissingTemplate_FailsAtOnce() =>
        RenderRetryPolicy.Decide(1, 3, new KeyNotFoundException("Template t not found.")).Should().BeOfType<RenderRetryDecision.Fail>();

    [TestCase(3, 3, false)]
    [TestCase(4, 3, true)]
    [TestCase(1, 1, false)]
    public void ReclaimedPastMaxAttempts_IsAbandoned(int attempts, int max, bool abandon) =>
        RenderRetryPolicy.ExceedsAttempts(attempts, max).Should().Be(abandon);

    // ── Claim eligibility (mirrors the claim SQL) ────────────────────────────

    [Test]
    public void Pending_WithoutDelay_IsClaimable() =>
        RenderRetryPolicy.IsClaimable("pending", true, null, null, Now).Should().BeTrue();

    [Test]
    public void Pending_WaitingForRetryDelay_IsNotClaimable() =>
        RenderRetryPolicy.IsClaimable("pending", true, Now.AddSeconds(30), null, Now).Should().BeFalse();

    [Test]
    public void Processing_WithLiveLease_IsNotClaimable() =>
        RenderRetryPolicy.IsClaimable("processing", true, null, Now.AddMinutes(4), Now).Should().BeFalse();

    [Test]
    public void Processing_WithExpiredLease_IsReclaimed() =>
        RenderRetryPolicy.IsClaimable("processing", true, null, Now.AddSeconds(-1), Now).Should().BeTrue();

    [TestCase("success")]
    [TestCase("failed")]
    public void FinishedJobs_AreNeverClaimed(string status) =>
        RenderRetryPolicy.IsClaimable(status, true, null, null, Now).Should().BeFalse();

    [Test]
    public void SynchronousJobRows_WithoutPayload_AreNeverClaimed() =>
        RenderRetryPolicy.IsClaimable("processing", false, null, null, Now).Should().BeFalse();

    // ── Payload round-trip ───────────────────────────────────────────────────

    [Test]
    public void PdfCommand_RoundTrips_WithTypedCells()
    {
        var cells = JsonDocument.Parse("""["A", 2, true]""").RootElement.EnumerateArray().ToList();
        var jobId = Guid.NewGuid();
        var original = new ExportPdfCommand
        {
            JobId = jobId,
            UserId = Guid.NewGuid(),
            TemplateKey = "invoice",
            TemplateVersion = 2,
            FileType = "docx",
            FileName = "out",
            ZipOutput = true,
            Data = new DocumentProcessingData
            {
                Replace = { ["customer"] = "บจก. สยามเทค" },
                Image = { ["logo"] = new ImageData { Src = "minio:reports/sandbox-assets/u/t/async/j/img_logo.png", Width = 120 } },
                Table =
                {
                    new TableData
                    {
                        Rows = { new Dictionary<string, object?> { ["item"] = cells[0], ["qty"] = cells[1], ["paid"] = cells[2], ["note"] = null } },
                        VerticalMergeFields = ["item"]
                    }
                }
            }
        };

        var back = RenderJobPayload.Deserialize(RenderJobPayload.Serialize(original)).Should().BeOfType<ExportPdfCommand>().Subject;

        back.JobId.Should().Be(jobId);
        back.UserId.Should().Be(original.UserId);
        back.TemplateVersion.Should().Be(2);
        back.FileType.Should().Be("docx");
        back.ZipOutput.Should().BeTrue();
        back.Data.Replace["customer"].Should().Be("บจก. สยามเทค");
        back.Data.Image["logo"]!.Src.Should().StartWith("minio:reports/");
        var row = back.Data.Table[0].Rows[0];
        ((JsonElement)row["item"]!).GetString().Should().Be("A");
        ((JsonElement)row["qty"]!).GetInt32().Should().Be(2);
        ((JsonElement)row["paid"]!).GetBoolean().Should().BeTrue();
        row["note"].Should().BeNull();
        back.Data.Table[0].VerticalMergeFields.Should().Equal("item");
    }

    [Test]
    public void ExcelCommand_KeepsItsKind()
    {
        var payload = RenderJobPayload.Serialize(new ExportExcelCommand { TemplateKey = "report", UserId = Guid.NewGuid() });

        RenderJobPayload.Deserialize(payload).Should().BeOfType<ExportExcelCommand>()
            .Which.SourceType.Should().Be("template-excel");
    }

    [Test]
    public void UnknownKind_IsRejected()
    {
        var act = () => RenderJobPayload.Deserialize("""{ "kind": "pptx", "command": {} }""");
        act.Should().Throw<InvalidDataException>();
    }

    [Test]
    public void AsyncAssets_StayInsideTheTemplatesBuilderFolder()
    {
        var user = Guid.NewGuid();
        var template = Guid.NewGuid();
        var job = Guid.NewGuid();

        QueueRenderCommandHandler.AssetPrefix(user, template, job)
            .Should().Be($"sandbox-assets/{user}/{template}/async/{job}");
    }
}
