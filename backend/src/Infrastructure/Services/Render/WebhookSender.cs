using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Webhooks;
using QorstackReportService.Infrastructure.Services.Http;

namespace QorstackReportService.Infrastructure.Services.Render;

/// <summary>Payload POSTed to <c>webhookUrl</c> when an async render finishes.</summary>
public sealed record RenderWebhookPayload(Guid JobId, string Status, string? DownloadUrl, int? ExpiresIn, string? Error);

/// <summary>
/// Delivers render webhooks through <see cref="SafeHttp"/> (any http(s) target, internal ones included),
/// signed with <c>Webhook:SigningSecret</c> when set.
/// One call = one delivery attempt; retries are scheduled by the async render worker and stored in
/// <c>report_jobs</c> (see <c>WebhookRetryPolicy</c>), so they survive restarts.
/// </summary>
public sealed class WebhookSender
{
    public const string HttpClientName = "render-webhook";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string? _secret;
    private readonly ILogger<WebhookSender> _logger;

    public WebhookSender(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<WebhookSender> logger)
    {
        _httpClientFactory = httpClientFactory;
        _secret = configuration["Webhook:SigningSecret"];
        _logger = logger;
    }

    public static IServiceCollection AddRenderWebhooks(IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpClient(HttpClientName, c =>
            {
                c.Timeout = TimeSpan.FromSeconds(10);
                c.DefaultRequestHeaders.UserAgent.ParseAdd("QorstackReport-Webhook/2");
            })
            .ConfigurePrimaryHttpMessageHandler(() => SafeHttp.CreateHandler(maxRedirects: 0));
        services.AddSingleton<WebhookSender>();
        return services;
    }

    /// <summary>Posts the payload once. Returns null on a 2xx answer, otherwise a short error description.</summary>
    public async Task<string?> TrySendAsync(string url, RenderWebhookPayload payload, CancellationToken ct)
    {
        if (!SafeHttp.IsHttpUrl(url, out var uri)) return "webhookUrl is not an http(s) URL";

        var body = JsonSerializer.Serialize(payload, Json);
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };
            request.Headers.Add("X-Qorstack-Event", "render.completed");
            if (!string.IsNullOrEmpty(_secret))
                request.Headers.Add(WebhookSignature.HeaderName, WebhookSignature.Compute(body, _secret));

            using var response = await _httpClientFactory.CreateClient(HttpClientName).SendAsync(request, ct);
            if (response.IsSuccessStatusCode) return null;
            _logger.LogWarning("[Webhook] Job {JobId}: {Url} answered {Status}",
                payload.JobId, uri.GetLeftPart(UriPartial.Path), (int)response.StatusCode);
            return $"HTTP {(int)response.StatusCode}";
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            _logger.LogWarning("[Webhook] Job {JobId}: delivery to {Url} failed: {Error}",
                payload.JobId, uri.GetLeftPart(UriPartial.Path), ex.Message);
            return ex.Message.Length > 500 ? ex.Message[..500] : ex.Message;
        }
    }
}
