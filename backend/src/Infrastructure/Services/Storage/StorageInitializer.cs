using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services.Storage;

public class StorageInitializer : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private readonly ILogger<StorageInitializer> _logger;

    public StorageInitializer(
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILogger<StorageInitializer> logger)
    {
        _serviceProvider = serviceProvider;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[Storage] Storage initialization starting...");

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var storageService = scope.ServiceProvider.GetRequiredService<IMinioStorageService>();

            var templateBucket     = _configuration["Minio:TemplateBucket"] ?? "templates";
            var reportBucket       = _configuration["Minio:ReportBucket"]   ?? "reports";
            const string fontsBucket = "system-fonts";

            await storageService.EnsureBucketExistsAsync(templateBucket);
            await storageService.EnsureBucketExistsAsync(reportBucket);
            await storageService.SetBucketLifecycleAsync(reportBucket, 1, "temp-download");
            await storageService.EnsureBucketExistsAsync(fontsBucket);

            _logger.LogInformation("[Storage] ✅ Storage ready — buckets: {Template}, {Report}, {Fonts}",
                templateBucket, reportBucket, fontsBucket);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Storage] ❌ Storage initialization failed");
        }
    }
}
