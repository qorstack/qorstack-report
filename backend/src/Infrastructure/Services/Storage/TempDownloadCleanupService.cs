using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services.Storage;

/// <summary>
/// Hourly: deletes <c>generated-report/temp-download/*</c> objects older than one day.
/// Backs up the bucket lifecycle rule, which some S3 servers do not support.
/// </summary>
public sealed class TempDownloadCleanupService : BackgroundService
{
    public const string Prefix = "temp-download/";
    public static readonly TimeSpan MaxAge = TimeSpan.FromDays(1);
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<TempDownloadCleanupService> _logger;

    public TempDownloadCleanupService(IServiceProvider serviceProvider, ILogger<TempDownloadCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    /// <summary>True when an object with this last-modified time should be deleted.</summary>
    public static bool IsExpired(DateTime? lastModifiedUtc, DateTime nowUtc) =>
        lastModifiedUtc is { } modified && nowUtc - modified.ToUniversalTime() > MaxAge;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let storage initialise first.
        try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); }
        catch (OperationCanceledException) { return; }

        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var storage = scope.ServiceProvider.GetRequiredService<IMinioStorageService>();
                var now = DateTime.UtcNow;
                var deleted = 0;
                foreach (var obj in await storage.ListObjectsAsync(StorageAreas.Reports, Prefix))
                {
                    if (!IsExpired(obj.LastModifiedUtc, now)) continue;
                    await storage.DeleteFileAsync(StorageAreas.Reports, obj.Key);
                    deleted++;
                }
                if (deleted > 0)
                    _logger.LogInformation("[Storage] Deleted {Count} expired temp download(s)", deleted);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "[Storage] Temp download cleanup failed; will retry next hour");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken).ConfigureAwait(false));
    }
}
