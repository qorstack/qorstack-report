using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Infrastructure.Data;

namespace QorstackReportService.Infrastructure.Services.Font;

/// <summary>
/// On startup, syncs user-uploaded fonts from MinIO → DB → Gotenberg volume.
/// Three-way sync ensures all three are consistent after restart.
/// </summary>
public class FontSyncService : BackgroundService
{
    private const string UserFontsBucket = "fonts";

    private readonly IServiceProvider _serviceProvider;
    private readonly IGotenbergFontCache _fontCache;
    private readonly ILogger<FontSyncService> _logger;

    public FontSyncService(
        IServiceProvider serviceProvider,
        IGotenbergFontCache fontCache,
        ILogger<FontSyncService> logger)
    {
        _serviceProvider = serviceProvider;
        _fontCache = fontCache;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var storage = scope.ServiceProvider.GetRequiredService<IMinioStorageService>();

            await storage.EnsureBucketExistsAsync(UserFontsBucket);
            await PurgeNullBucketRecordsAsync(db, stoppingToken);
            await WarmUploadedFontsAsync(db, storage, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            Console.WriteLine("[Font] Sync interrupted — will resume on next startup");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Font] ERROR: {ex.Message}");
            _logger.LogError(ex, "[Font] Font sync failed");
        }
    }

    private static async Task PurgeNullBucketRecordsAsync(ApplicationDbContext db, CancellationToken ct)
    {
        var nullIds = await db.Set<Domain.Entities.Font>()
            .Where(f => f.StorageBucket == null)
            .Select(f => f.Id)
            .ToListAsync(ct);

        if (nullIds.Count == 0) return;

        await db.Set<Domain.Entities.FontOwnership>()
            .Where(o => nullIds.Contains(o.FontId))
            .ExecuteDeleteAsync(ct);
        await db.Set<Domain.Entities.Font>()
            .Where(f => f.StorageBucket == null)
            .ExecuteDeleteAsync(ct);

        Console.WriteLine($"[Font] Purged {nullIds.Count} record(s) with NULL storage_bucket");
    }

    // ── Sync uploaded fonts: MinIO fonts bucket → DB → Gotenberg volume ─────────
    // Three-way sync on startup so all three are consistent:
    //   1. If a font was deleted directly from MinIO → remove from DB + volume
    //   2. If a font is in DB but missing from volume (restart) → re-download from MinIO
    //   3. If a stale file is in volume but not in active DB → remove from volume
    private async Task WarmUploadedFontsAsync(ApplicationDbContext db, IMinioStorageService storage, CancellationToken ct)
    {
        var dbFonts = await db.Set<Domain.Entities.Font>()
            .Where(f => f.IsActive && f.StorageBucket == UserFontsBucket)
            .Select(f => new { f.Id, f.StorageBucket, f.StorageKey })
            .ToListAsync(ct);

        // Step 1: Remove DB records whose MinIO object no longer exists
        if (dbFonts.Count > 0)
        {
            var minioObjects = await storage.ListObjectsAsync(UserFontsBucket);
            var minioKeys = minioObjects.Select(o => o.Key).ToHashSet();

            var ghostFontIds = dbFonts
                .Where(f => !minioKeys.Contains(f.StorageKey))
                .Select(f => f.Id)
                .ToList();

            if (ghostFontIds.Count > 0)
            {
                await db.Set<Domain.Entities.FontOwnership>()
                    .Where(o => ghostFontIds.Contains(o.FontId))
                    .ExecuteDeleteAsync(ct);
                await db.Set<Domain.Entities.Font>()
                    .Where(f => ghostFontIds.Contains(f.Id))
                    .ExecuteDeleteAsync(ct);
                Console.WriteLine($"[Font] Removed {ghostFontIds.Count} uploaded font(s) deleted directly from MinIO");

                dbFonts = dbFonts.Where(f => !ghostFontIds.Contains(f.Id)).ToList();
            }
        }

        if (!_fontCache.IsEnabled)
        {
            Console.WriteLine($"[Font] Uploaded fonts DB in sync ({dbFonts.Count} font(s)) — Gotenberg volume not configured");
            return;
        }

        var expectedFiles = dbFonts
            .Select(f => Path.GetFileName(f.StorageKey))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Step 2: Remove stale files from volume (font deleted via API but file lingered)
        var currentFiles = await _fontCache.ListFilesAsync();
        foreach (var file in currentFiles.Where(f => !expectedFiles.Contains(f)))
        {
            await _fontCache.DeleteAsync(file, ct);
            _logger.LogDebug("[Font] Removed stale font from volume: {File}", file);
        }

        // Step 3: Re-download fonts missing from volume (after restart)
        var currentSet = currentFiles.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var toWarm = dbFonts.Where(f => !currentSet.Contains(Path.GetFileName(f.StorageKey))).ToList();

        if (toWarm.Count == 0)
        {
            Console.WriteLine($"[Font] Uploaded fonts in sync ({expectedFiles.Count} font(s))");
            return;
        }

        Console.WriteLine($"[Font] Warming {toWarm.Count} uploaded font(s) into Gotenberg volume...");

        var tasks = toWarm.Select(async font =>
        {
            try
            {
                var stream = await storage.DownloadFileAsync(font.StorageBucket!, font.StorageKey);
                using var ms = new MemoryStream();
                await stream.CopyToAsync(ms, ct);
                await _fontCache.WriteAsync(Path.GetFileName(font.StorageKey), ms.ToArray(), ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[Font] Failed to warm uploaded font {Key}", font.StorageKey);
            }
        });

        await Task.WhenAll(tasks);
        Console.WriteLine("[Font] Uploaded fonts warmed.");
    }
}
