using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services.Storage;

/// <summary>
/// Creates the single storage bucket and sets the temp-download expiry rule.
/// Warns (does not copy) when data from the pre-v2 bucket layout has not been migrated yet.
/// </summary>
public class StorageInitializer : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly StorageSettings _settings;
    private readonly ILogger<StorageInitializer> _logger;

    public StorageInitializer(
        IServiceProvider serviceProvider,
        IOptions<StorageSettings> settings,
        ILogger<StorageInitializer> logger)
    {
        _serviceProvider = serviceProvider;
        _settings = settings.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[Storage] Storage initialization starting...");

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var storageService = scope.ServiceProvider.GetRequiredService<IMinioStorageService>();

            // Storage may still be starting (it is an optional compose dependency): retry for ~2 minutes.
            for (var attempt = 1; ; attempt++)
            {
                try
                {
                    await storageService.EnsureBucketExistsAsync(StorageAreas.Templates);
                    break;
                }
                catch (Exception ex) when (attempt < 12 && !stoppingToken.IsCancellationRequested)
                {
                    _logger.LogWarning("[Storage] Storage not reachable yet ({Message}); retrying in 10 s ({Attempt}/12)", ex.Message, attempt);
                    await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
                }
            }
            // Temporary downloads expire after 1 day (generated-report/temp-download/*). Not every S3 server
            // supports lifecycle rules — TempDownloadCleanupService deletes them anyway.
            try
            {
                await storageService.SetBucketLifecycleAsync(StorageAreas.Reports, 1, "temp-download");
            }
            catch (Exception ex)
            {
                _logger.LogWarning("[Storage] Lifecycle rule not applied ({Message}); the hourly cleanup job handles temp downloads.", ex.Message);
            }

            _logger.LogInformation("[Storage] ✅ Storage ready — bucket: {Bucket} (template/, generated-report/, fonts/)",
                _settings.Bucket);

            if (storageService is MinioStorageService minio)
            {
                var pending = await minio.FindUnmigratedLegacyBucketsAsync(stoppingToken);
                if (pending.Count > 0)
                {
                    _logger.LogWarning(
                        "[Storage] ⚠ Found data in old bucket(s) {Buckets} that is not in '{Bucket}' yet. " +
                        "Templates, reports or fonts from before v2 will be missing until you run selfhost/migrate-storage.sh (keep-minio | to-rustfs) " +
                        "(see README › Upgrading to v2).",
                        string.Join(", ", pending), _settings.Bucket);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "[Storage] ❌ Cannot reach file storage at {Endpoint} (bucket {Bucket}) — check STORAGE_ENDPOINT, the access keys, " +
                "and that the storage container is running (selfhost: `docker compose ps`). Uploads and downloads will fail until it is reachable.",
                _settings.Endpoint, _settings.Bucket);
        }
    }
}
