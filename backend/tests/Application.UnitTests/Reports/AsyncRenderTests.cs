using System.Text;
using System.Text.Json;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Webhooks;
using Microsoft.Extensions.Configuration;
using QorstackReportService.Application.Reports.Commands.ExportPdf;
using QorstackReportService.Application.Reports.Commands.QueueRender;
using QorstackReportService.Application.Reports.Models;
using QorstackReportService.Domain.Entities;
using QorstackReportService.Infrastructure.Services.Render;

namespace QorstackReportService.Application.UnitTests.Reports;

/// <summary>Async render gate + request checks, webhook signature, job error text.</summary>
[TestFixture]
public class AsyncRenderTests
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    // ── Webhook signature ────────────────────────────────────────────────────

    [Test]
    public void WebhookSignature_IsHexHmacSha256()
    {
        // RFC-style known vector: HMAC-SHA256(key="key", "The quick brown fox jumps over the lazy dog")
        WebhookSignature.Compute("The quick brown fox jumps over the lazy dog", "key")
            .Should().Be("sha256=f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8");
    }

    [Test]
    public void WebhookSignature_VerifiesOnlyTheExactBody()
    {
        var header = WebhookSignature.Compute("{\"jobId\":\"1\"}", "s3cret");
        WebhookSignature.Verify("{\"jobId\":\"1\"}", "s3cret", header).Should().BeTrue();
        WebhookSignature.Verify("{\"jobId\":\"2\"}", "s3cret", header).Should().BeFalse();
        WebhookSignature.Verify("{\"jobId\":\"1\"}", "other", header).Should().BeFalse();
        WebhookSignature.Verify("{\"jobId\":\"1\"}", "s3cret", null).Should().BeFalse();
    }

    // ── Async gate + request checks ──────────────────────────────────────────

    [Test]
    public async Task Async_WithoutProLicense_ThrowsProFeatureRequired()
    {
        var flags = new Mock<IFeatureFlagService>();
        flags.SetupGet(f => f.AsyncRender).Returns(false);
        var context = new Mock<IApplicationDbContext>(MockBehavior.Strict);
        var queue = new Mock<IAsyncRenderQueue>(MockBehavior.Strict);
        var handler = new QueueRenderCommandHandler(flags.Object, context.Object, queue.Object,
            Mock.Of<ISandboxAssetService>(), Mock.Of<IUser>(), new ConfigurationBuilder().Build());

        var act = () => handler.Handle(new QueueRenderCommand { Render = new ExportPdfCommand { TemplateKey = "t" } }, CancellationToken.None);

        await act.Should().ThrowAsync<ProFeatureRequiredException>();
        queue.VerifyNoOtherCalls();
    }

    [Test]
    public void WebhookUrl_WithoutAsync_IsRejected()
    {
        var request = JsonSerializer.Deserialize<PdfFromTemplateRequest>(
            """{ "templateKey": "t", "webhookUrl": "https://example.com/hook" }""", Web)!;

        var act = () => RenderRequestMapper.ToDocumentProcessingData(request);

        act.Should().Throw<ValidationException>().Which.ValidationErrors
            .Should().ContainSingle(e => e.Key == "webhookUrl");
    }

    [TestCase("ftp://example.com/hook")]
    [TestCase("not a url")]
    public void WebhookUrl_MustBeHttp(string url)
    {
        var request = JsonSerializer.Deserialize<ExcelFromTemplateRequest>(
            $$"""{ "templateKey": "t", "async": true, "webhookUrl": "{{url}}" }""", Web)!;

        var act = () => RenderRequestMapper.ToDocumentProcessingData(request);

        act.Should().Throw<ValidationException>().Which.ValidationErrors
            .Should().ContainSingle(e => e.Key == "webhookUrl" && e.Message.Contains("http(s)"));
    }

    [Test]
    public void Async_WithHttpsWebhook_IsAccepted()
    {
        var request = JsonSerializer.Deserialize<PdfFromTemplateRequest>(
            """{ "templateKey": "t", "async": true, "webhookUrl": "https://example.com/hook" }""", Web)!;

        request.Async.Should().BeTrue();
        var act = () => RenderRequestMapper.ToDocumentProcessingData(request);
        act.Should().NotThrow();
    }

    // ── Error text ───────────────────────────────────────────────────────────

    [Test]
    public void FailedJobMessage_HidesUnknownErrors()
    {
        var id = Guid.NewGuid();
        AsyncRenderWorker.Describe(new KeyNotFoundException("Template t not found."), id).Should().Be("Template t not found.");
        AsyncRenderWorker.Describe(new NullReferenceException("secret internals"), id).Should().NotContain("secret").And.Contain(id.ToString());
    }
}
