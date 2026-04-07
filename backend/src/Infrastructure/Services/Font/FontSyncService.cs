using System.Collections.Concurrent;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Infrastructure.Data;

namespace QorstackReportService.Infrastructure.Services.Font;

public class FontSyncService : BackgroundService
{
    private const string SystemFontsBucket = "system-fonts";
    private static readonly string[] SupportedExtensions = [".ttf", ".otf", ".woff", ".woff2"];

    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<FontSyncService> _logger;

    public FontSyncService(IServiceProvider serviceProvider, ILogger<FontSyncService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var storage = scope.ServiceProvider.GetRequiredService<IMinioStorageService>();

            await storage.EnsureBucketExistsAsync(SystemFontsBucket);
            await SyncFontsAsync(db, storage, stoppingToken);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Font] ERROR: {ex.Message}");
            _logger.LogError(ex, "[Font] Font sync failed");
        }

        var rawUrl = Environment.GetEnvironmentVariable("ASPNETCORE_URLS") ?? "http://localhost:5000";
        var displayUrl = rawUrl.Split(';').First().Replace("*", "localhost").Replace("+", "localhost");

        Console.WriteLine();
        Console.WriteLine("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        Console.WriteLine("    Q O R S T A C K   R E P O R T   S E R V I C E");
        Console.WriteLine($"    ▶  {displayUrl}");
        Console.WriteLine("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        Console.WriteLine();
    }

    private async Task SyncFontsAsync(ApplicationDbContext db, IMinioStorageService storage, CancellationToken ct)
    {
        var localFiles = GetLocalFontFiles();
        var minioObjects = await storage.ListObjectsAsync(SystemFontsBucket);
        var minioKeys = minioObjects.Select(o => o.Key).ToHashSet();
        var localFileNames = localFiles.Select(Path.GetFileName).ToHashSet()!;

        var dbRecords = await db.Set<Domain.Entities.Font>()
            .Where(f => f.StorageBucket == SystemFontsBucket)
            .Select(f => new { f.Id, f.StorageKey, f.FileHash })
            .ToListAsync(ct);

        var dbByKey = dbRecords.ToDictionary(f => f.StorageKey);

        var toDelete = localFiles.Count > 0
            ? minioKeys.Where(k => !localFileNames.Contains(k)).ToList()
            : [];
        var toUpload = localFiles.Where(p => !minioKeys.Contains(Path.GetFileName(p))).ToList();
        var toRegister = localFiles.Select(Path.GetFileName)
            .Where(name => minioKeys.Contains(name!) && !dbByKey.ContainsKey(name!))
            .ToList();


        var deleted = 0;
        var added = 0;

        // ── Delete: DB first → Minio ───────────────────────────────────────────
        if (toDelete.Count > 0)
        {
            Console.WriteLine($"[Font] Deleting {toDelete.Count} font(s)...");

            var fontIdsToDelete = await db.Set<Domain.Entities.Font>()
                .Where(f => f.StorageBucket == SystemFontsBucket && toDelete.Contains(f.StorageKey))
                .Select(f => f.Id)
                .ToListAsync(ct);

            var dbDeleteOk = false;
            try
            {
                await db.Set<Domain.Entities.FontOwnership>()
                    .Where(o => fontIdsToDelete.Contains(o.FontId))
                    .ExecuteDeleteAsync(ct);

                deleted = await db.Set<Domain.Entities.Font>()
                    .Where(f => fontIdsToDelete.Contains(f.Id))
                    .ExecuteDeleteAsync(ct);

                var remaining = await db.Set<Domain.Entities.Font>()
                    .CountAsync(f => f.StorageBucket == SystemFontsBucket && toDelete.Contains(f.StorageKey), ct);

                if (remaining > 0)
                    _logger.LogWarning("[Font] {Remaining} record(s) still in DB after delete", remaining);

                dbDeleteOk = true;
                Console.WriteLine($"[Font] DB: {deleted} deleted");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Font] Failed to delete from DB — skipping Minio deletion");
            }

            if (dbDeleteOk)
            {
                var n = toDelete.Count;
                var i = 0;
                foreach (var key in toDelete)
                {
                    try { await storage.DeleteFileAsync(SystemFontsBucket, key); }
                    catch (Exception ex) { _logger.LogWarning(ex, "[Font] Failed to delete {Key} from Minio", key); }
                    i++;
                    if (ShouldLog(i, n))
                        Console.WriteLine($"[Font] [{ProgressBar(i, n)}] {i * 100 / n,3}% ({i}/{n})");
                }
                if (!ShouldLog(n, n))
                    Console.WriteLine($"[Font] [{ProgressBar(n, n)}] 100% ({n}/{n})");
            }
        }

        // ── Upload: Minio + insert to DB ───────────────────────────────────────
        if (toUpload.Count > 0)
        {
            Console.WriteLine($"[Font] Uploading {toUpload.Count} font(s)...");

            var total = toUpload.Count;
            var done = 0;
            var failed = 0;
            var newFonts = new ConcurrentBag<Domain.Entities.Font>();
            var semaphore = new SemaphoreSlim(64);

            var uploadTasks = toUpload.Select(async filePath =>
            {
                await semaphore.WaitAsync(ct);
                try
                {
                    try
                    {
                        var fileBytes = await File.ReadAllBytesAsync(filePath, ct);
                        var hash = ComputeHash(fileBytes);
                        var fileName = Path.GetFileName(filePath);
                        using var stream = new MemoryStream(fileBytes);
                        await storage.UploadFileAsync(SystemFontsBucket, fileName, stream, "application/octet-stream");

                        var meta = FontMetadataReader.Read(fileBytes, fileName);
                        var ext = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();
                        newFonts.Add(new Domain.Entities.Font
                        {
                            Id = Guid.NewGuid(),
                            Name = meta.Name,
                            FamilyName = meta.FamilyName,
                            SubFamilyName = meta.SubFamilyName,
                            Weight = meta.Weight,
                            IsItalic = meta.IsItalic,
                            FileFormat = ext,
                            FileSizeBytes = fileBytes.Length,
                            FileHash = hash,
                            StorageBucket = SystemFontsBucket,
                            StorageKey = fileName,
                            IsSystemFont = true,
                            SyncSource = "startup_scan",
                            IsActive = true,
                            CreatedBy = "SYSTEM_FONT_SYNC",
                            CreatedDatetime = DateTime.UtcNow,
                        });
                    }
                    catch (Exception ex)
                    {
                        Interlocked.Increment(ref failed);
                        _logger.LogWarning(ex, "[Font] Failed to upload {File}", Path.GetFileName(filePath));
                    }

                    var current = Interlocked.Increment(ref done);
                    if (ShouldLog(current, total) && current < total)
                        Console.WriteLine($"[Font] [{ProgressBar(current, total)}] {current * 100 / total,3}% ({current}/{total})");
                }
                finally { semaphore.Release(); }
            });

            await Task.WhenAll(uploadTasks);
            Console.WriteLine($"[Font] [{ProgressBar(total, total)}] 100% ({total}/{total})");

            db.Set<Domain.Entities.Font>().AddRange(newFonts);
            added = newFonts.Count;
            await db.SaveChangesAsync(ct);

            if (failed > 0)
                _logger.LogWarning("[Font] {Failed} upload(s) failed", failed);
        }

        // ── Reconcile: in Minio but missing from DB ────────────────────────────
        if (toRegister.Count > 0)
        {
            Console.WriteLine($"[Font] Reconciling {toRegister.Count} font(s)...");

            var fontsDir = ResolveFontsPath();
            var total = toRegister.Count;
            var done = 0;
            var failed = 0;
            var newFontsToInsert = new ConcurrentBag<Domain.Entities.Font>();
            var semaphore = new SemaphoreSlim(64);

            var reconTasks = toRegister.Select(async fileName =>
            {
                await semaphore.WaitAsync(ct);
                try
                {
                    try
                    {
                        var filePath = Path.Combine(fontsDir, fileName!);
                        var fileBytes = await File.ReadAllBytesAsync(filePath, ct);
                        var hash = ComputeHash(fileBytes);
                        var meta = FontMetadataReader.Read(fileBytes, fileName!);
                        var ext = Path.GetExtension(fileName!).TrimStart('.').ToLowerInvariant();
                        newFontsToInsert.Add(new Domain.Entities.Font
                        {
                            Id = Guid.NewGuid(),
                            Name = meta.Name,
                            FamilyName = meta.FamilyName,
                            SubFamilyName = meta.SubFamilyName,
                            Weight = meta.Weight,
                            IsItalic = meta.IsItalic,
                            FileFormat = ext,
                            FileSizeBytes = fileBytes.Length,
                            FileHash = hash,
                            StorageBucket = SystemFontsBucket,
                            StorageKey = fileName!,
                            IsSystemFont = true,
                            SyncSource = "startup_scan",
                            IsActive = true,
                            CreatedBy = "SYSTEM_FONT_SYNC",
                            CreatedDatetime = DateTime.UtcNow,
                        });
                    }
                    catch (Exception ex)
                    {
                        Interlocked.Increment(ref failed);
                        _logger.LogWarning(ex, "[Font] Failed to reconcile {File}", fileName);
                    }

                    var current = Interlocked.Increment(ref done);
                    if (ShouldLog(current, total) && current < total)
                        Console.WriteLine($"[Font] [{ProgressBar(current, total)}] {current * 100 / total,3}% ({current}/{total})");
                }
                finally { semaphore.Release(); }
            });

            await Task.WhenAll(reconTasks);
            Console.WriteLine($"[Font] [{ProgressBar(total, total)}] 100% ({total}/{total})");

            if (newFontsToInsert.Count > 0)
            {
                db.Set<Domain.Entities.Font>().AddRange(newFontsToInsert);
                added += newFontsToInsert.Count;
                await db.SaveChangesAsync(ct);
            }

            if (failed > 0)
                _logger.LogWarning("[Font] {Failed} reconcile(s) failed", failed);
        }

        var finalDb = dbRecords.Count + added - deleted;
        if (added == 0 && deleted == 0)
            Console.WriteLine($"[Font] Local: {localFiles.Count}  Minio: {minioKeys.Count}  DB: {finalDb}  — in sync");
        else
            Console.WriteLine($"[Font] After   Local: {localFiles.Count}  Minio: {minioKeys.Count}  DB: {finalDb}  (+{added} / -{deleted})");
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static List<string> GetLocalFontFiles()
    {
        var fontsPath = ResolveFontsPath();
        if (!Directory.Exists(fontsPath)) return [];
        return Directory.GetFiles(fontsPath)
            .Where(p => SupportedExtensions.Contains(Path.GetExtension(p).ToLowerInvariant()))
            .ToList();
    }

    private static string ComputeHash(byte[] bytes) =>
        Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

    // Log every file for small batches; ~20 updates for large batches
    private static bool ShouldLog(int current, int total) =>
        total <= 20 || current % Math.Max(1, total / 20) == 0;

    private static string ProgressBar(int done, int total)
    {
        const int barWidth = 50;
        var filled = done * barWidth / total;
        return new string('#', filled) + new string('-', barWidth - filled);
    }

    private static string ResolveFontsPath()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            if (dir.GetFiles("*.sln").Length > 0)
                return Path.Combine(dir.FullName, "fonts");
            dir = dir.Parent;
        }
        return Path.Combine(AppContext.BaseDirectory, "fonts");
    }
}
