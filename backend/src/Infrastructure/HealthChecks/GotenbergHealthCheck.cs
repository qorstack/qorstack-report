using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using QorstackReportService.Infrastructure.Services.Pdf;

namespace QorstackReportService.Infrastructure.HealthChecks;

public class GotenbergHealthCheck : IHealthCheck
{
    private readonly GotenbergSettings _settings;

    public GotenbergHealthCheck(IOptions<GotenbergSettings> settings)
    {
        _settings = settings.Value;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var baseUrl = _settings.BaseUrl;
        if (!baseUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !baseUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            baseUrl = $"http://{baseUrl}";

        try
        {
            // Use a plain HttpClient (no logging middleware) to avoid polluting startup output
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            var response = await client.GetAsync($"{baseUrl}/health", cancellationToken);
            return response.IsSuccessStatusCode
                ? HealthCheckResult.Healthy(baseUrl)
                : HealthCheckResult.Unhealthy($"HTTP {(int)response.StatusCode} from {baseUrl}");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy(ex.Message);
        }
    }
}
