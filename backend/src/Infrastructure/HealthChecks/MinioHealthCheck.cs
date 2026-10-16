using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using QorstackReportService.Infrastructure.Services.Storage;

namespace QorstackReportService.Infrastructure.HealthChecks;

public class MinioHealthCheck : IHealthCheck
{
    private readonly StorageSettings _settings;

    public MinioHealthCheck(IOptions<StorageSettings> settings)
    {
        _settings = settings.Value;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var endpoint = _settings.Endpoint
                .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
                .Replace("http://", "", StringComparison.OrdinalIgnoreCase);

            var client = new MinioClient()
                .WithEndpoint(endpoint)
                .WithCredentials(_settings.AccessKey, _settings.SecretKey)
                .WithSSL(_settings.UseSsl)
                .Build();

            var args = new BucketExistsArgs().WithBucket(_settings.Bucket);
            await client.BucketExistsAsync(args, cancellationToken);
            var scheme = _settings.UseSsl ? "https" : "http";
            return HealthCheckResult.Healthy($"{scheme}://{endpoint}");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy(
                $"Cannot reach file storage at {_settings.Endpoint} (bucket {_settings.Bucket}) — check STORAGE_ENDPOINT and that the storage container is running. {ex.Message}");
        }
    }
}
