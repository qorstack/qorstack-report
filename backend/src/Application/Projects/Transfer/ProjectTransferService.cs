using System.IO.Compression;
using System.Reflection;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Helpers;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Projects.Transfer;

public interface IProjectTransferService
{
    /// <summary>Checks access + Pro and returns the download file name for the export.</summary>
    Task<string> PrepareExportAsync(Guid projectId, CancellationToken ct);

    /// <summary>Writes the project export ZIP (latest active version of every template + assets + fonts).</summary>
    Task ExportAsync(Guid projectId, Stream output, CancellationToken ct);

    /// <summary>Plans (dryRun) or applies an import from a seekable ZIP stream.</summary>
    Task<ProjectImportResult> ImportAsync(Guid projectId, Stream zip, bool dryRun, CancellationToken ct);
}

/// <summary>
/// Pro feature: move a whole project between deployments (e.g. staging → production) as one ZIP.
/// Export = latest active version of each template, its builder test data and assets, and uploaded fonts.
/// Import = new templates are created with the same key, newer versions are added, everything else is skipped.
/// API keys, members, users, history and secrets are never exported.
/// </summary>
public sealed class ProjectTransferService : IProjectTransferService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storage;
    private readonly IDocxProcessingService _docx;
    private readonly IExcelProcessingService _excel;
    private readonly IGotenbergService _gotenberg;
    private readonly IGotenbergFontCache _fontCache;
    private readonly IFeatureFlagService _features;
    private readonly IUser _user;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ProjectTransferService> _logger;

    public ProjectTransferService(
        IApplicationDbContext context,
        IMinioStorageService storage,
        IDocxProcessingService docx,
        IExcelProcessingService excel,
        IGotenbergService gotenberg,
        IGotenbergFontCache fontCache,
        IFeatureFlagService features,
        IUser user,
        IConfiguration configuration,
        ILogger<ProjectTransferService> logger)
    {
        _context = context;
        _storage = storage;
        _docx = docx;
        _excel = excel;
        _gotenberg = gotenberg;
        _fontCache = fontCache;
        _features = features;
        _user = user;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>Max entries / uncompressed bytes accepted from an import ZIP (zip-bomb guard).</summary>
    private long MaxUncompressedBytes => Math.Max(1, _configuration.GetValue("Transfer:MaxZipMb", 200)) * 1024L * 1024L * 4;

    // ── Export ──────────────────────────────────────────────────────────────

    public async Task<string> PrepareExportAsync(Guid projectId, CancellationToken ct)
    {
        var project = await GetOwnedProjectAsync(projectId, ct);
        return $"{ProjectTransferRules.Slug(project.Name)}-{DateTime.UtcNow:yyyyMMdd}.qorstack.zip";
    }

    public async Task ExportAsync(Guid projectId, Stream output, CancellationToken ct)
    {
        var project = await GetOwnedProjectAsync(projectId, ct);
        var manifest = new ProjectTransferManifest
        {
            ExportedAt = DateTime.UtcNow,
            AppVersion = Assembly.GetEntryAssembly()?.GetName().Version?.ToString(),
            Project = new ManifestProject
            {
                Name = project.Name,
                Description = project.Description,
                LogEnabled = project.LogEnabled,
                LogRetentionDays = project.LogRetentionDays
            }
        };

        var templates = await _context.Templates
            .AsNoTracking()
            .Include(t => t.TemplateVersions)
            .Where(t => t.ProjectId == projectId)
            .OrderBy(t => t.Name)
            .ToListAsync(ct);

        // Build in a temp file (ZipArchive finishes with synchronous writes, which Kestrel's response stream
        // rejects), then stream it to the client. Nothing is held in memory beyond one file at a time.
        var tempPath = Path.Combine(Path.GetTempPath(), $"qorstack-export-{Guid.NewGuid():N}.zip");
        await using var temp = new FileStream(tempPath, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None, 81920, FileOptions.DeleteOnClose);
        using (var zip = new ZipArchive(temp, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var template in templates)
            {
                var version = template.TemplateVersions.FirstOrDefault(v => v.Status == "active")
                              ?? template.TemplateVersions.OrderByDescending(v => v.Version).FirstOrDefault();
                if (version == null) continue;
                if (!ProjectTransferRules.IsSafeSegment(template.TemplateKey))
                {
                    _logger.LogWarning("[Transfer] Template key {Key} can't be used as a file path — skipped in export", template.TemplateKey);
                    continue;
                }

                var ext = Path.GetExtension(version.FilePath).ToLowerInvariant();
                var fileName = $"template{(ext is ".xlsx" or ".xls" ? ".xlsx" : ".docx")}";
                var bytes = await ReadAllAsync(StorageAreas.Templates, version.FilePath);
                await WriteEntryAsync(zip, ProjectTransferRules.TemplatePath(template.TemplateKey, version.Version, fileName), bytes, ct);

                var entry = new ManifestTemplate
                {
                    Key = template.TemplateKey,
                    Name = template.Name,
                    Type = fileName.EndsWith(".xlsx", StringComparison.Ordinal) ? "excel" : "word",
                    Version = version.Version,
                    FileName = fileName,
                    Sha256 = ProjectTransferRules.Sha256Hex(bytes),
                    SandboxPayload = ParsePayload(version.SandboxPayload)
                };

                // Builder assets (uploaded images / QR logos) that belong to this template.
                var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var path in ProjectTransferRules.FindStoragePaths(version.SandboxPayload))
                {
                    if (!ProjectTransferRules.IsTemplateAsset(path, template.Id)) continue;
                    try
                    {
                        var assetBytes = await ReadAllAsync(StorageAreas.Reports, ProjectTransferRules.AssetObjectKey(path));
                        var assetName = ProjectTransferRules.AssetFileName(path, used);
                        await WriteEntryAsync(zip, ProjectTransferRules.AssetPath(template.TemplateKey, assetName), assetBytes, ct);
                        entry.Assets.Add(new ManifestAsset { Source = path, FileName = assetName, Sha256 = ProjectTransferRules.Sha256Hex(assetBytes) });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[Transfer] Asset {Path} of template {Key} could not be read — left out", path, template.TemplateKey);
                    }
                }

                manifest.Templates.Add(entry);
            }

            // Uploaded fonts are global (shared by every project), so all of them travel with the export.
            var fonts = await _context.Fonts
                .AsNoTracking()
                .Where(f => f.IsActive && !f.IsSystemFont && f.SyncSource == "upload" && f.StorageBucket != null)
                .OrderBy(f => f.FamilyName).ThenBy(f => f.Weight)
                .ToListAsync(ct);
            var fontNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var font in fonts)
            {
                var original = font.StorageKey.Split('/').Last();
                var fileName = ProjectTransferRules.AssetFileName("x/" + original, fontNames);
                if (!ProjectTransferRules.IsSafeSegment(fileName)) continue;
                try
                {
                    var bytes = await ReadAllAsync(font.StorageBucket!, font.StorageKey);
                    await WriteEntryAsync(zip, ProjectTransferRules.FontPath(fileName), bytes, ct);
                    manifest.Fonts.Add(new ManifestFont
                    {
                        Name = font.Name,
                        Family = font.FamilyName,
                        SubFamily = font.SubFamilyName,
                        Weight = font.Weight,
                        Italic = font.IsItalic,
                        FileName = fileName,
                        Sha256 = ProjectTransferRules.Sha256Hex(bytes)
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[Transfer] Font {FontId} could not be read — left out", font.Id);
                }
            }

            await WriteEntryAsync(zip, ProjectTransferRules.ManifestEntry, JsonSerializer.SerializeToUtf8Bytes(manifest, Json), ct);
        }

        temp.Position = 0;
        await temp.CopyToAsync(output, ct);
        _logger.LogInformation("[Transfer] Exported project {ProjectId}: {Templates} template(s), {Fonts} font(s)",
            projectId, manifest.Templates.Count, manifest.Fonts.Count);
    }

    // ── Import ──────────────────────────────────────────────────────────────

    public async Task<ProjectImportResult> ImportAsync(Guid projectId, Stream zipStream, bool dryRun, CancellationToken ct)
    {
        var project = await GetOwnedProjectAsync(projectId, ct);
        var ownerId = project.UserId;

        ZipArchive zip;
        try { zip = new ZipArchive(zipStream, ZipArchiveMode.Read, leaveOpen: true); }
        catch (InvalidDataException) { throw new ValidationException("The file is not a valid ZIP archive."); }

        using (zip)
        {
            var (entries, manifest) = await ProjectTransferArchive.OpenAsync(zip, MaxUncompressedBytes, ct);

            var result = new ProjectImportResult
            {
                DryRun = dryRun,
                SourceProject = manifest.Project.Name,
                ExportedAt = manifest.ExportedAt
            };

            // ── Plan templates ──
            var plans = new List<(ManifestTemplate Source, ImportTemplateItem Item, byte[] File, Dictionary<string, byte[]> Assets, Template? Target)>();
            var seenKeys = new HashSet<string>(StringComparer.Ordinal);
            foreach (var source in manifest.Templates)
            {
                var item = new ImportTemplateItem { Key = source.Key, Name = string.IsNullOrWhiteSpace(source.Name) ? source.Key : source.Name, ToVersion = source.Version };
                result.Templates.Add(item);

                var invalid = ProjectTransferRules.ValidateTemplateEntry(source);
                if (invalid == null && !seenKeys.Add(source.Key)) invalid = "duplicate key in the archive";
                if (invalid != null) { Skip(item, invalid, result); continue; }

                var file = await ProjectTransferArchive.ReadVerifiedAsync(entries, ProjectTransferRules.TemplatePath(source.Key, source.Version, source.FileName), source.Sha256, ct);
                if (file == null) { Skip(item, "file missing or checksum mismatch", result); continue; }

                var validation = await ValidateTemplateFileAsync(file, source.FileName);
                if (validation != null) { Skip(item, $"invalid template file: {validation}", result); continue; }

                var target = await _context.Templates
                    .Include(t => t.TemplateVersions)
                    .FirstOrDefaultAsync(t => t.ProjectId == projectId && t.TemplateKey == source.Key, ct);
                var otherProject = target == null && await _context.Templates
                    .AnyAsync(t => t.UserId == ownerId && t.TemplateKey == source.Key && t.ProjectId != projectId, ct);

                var latest = target?.TemplateVersions.Count > 0 ? target.TemplateVersions.Max(v => v.Version) : (int?)null;
                if (target != null && latest == null) latest = 0;
                var (action, reason) = ProjectTransferRules.Decide(source.Version, latest, otherProject);
                item.Action = action;
                item.Reason = reason;
                item.FromVersion = target == null ? null : latest;

                var assets = new Dictionary<string, byte[]>(StringComparer.Ordinal);
                if (action != ImportAction.Skip)
                {
                    foreach (var asset in source.Assets)
                    {
                        if (!ProjectTransferRules.IsSafeSegment(asset.FileName) || !asset.Source.StartsWith("minio:", StringComparison.Ordinal))
                        {
                            result.Warnings.Add($"{source.Key}: asset \"{asset.FileName}\" ignored (invalid name).");
                            continue;
                        }
                        var bytes = await ProjectTransferArchive.ReadVerifiedAsync(entries, ProjectTransferRules.AssetPath(source.Key, asset.FileName), asset.Sha256, ct);
                        if (bytes == null) { result.Warnings.Add($"{source.Key}: asset \"{asset.FileName}\" missing or checksum mismatch — left out."); continue; }
                        assets[asset.Source] = bytes;
                    }
                }

                plans.Add((source, item, file, assets, target));
            }

            // ── Plan fonts ──
            var fontPlans = new List<(ManifestFont Source, byte[] File)>();
            foreach (var font in manifest.Fonts)
            {
                var item = new ImportFontItem { Name = string.IsNullOrWhiteSpace(font.Name) ? font.FileName : font.Name };
                result.Fonts.Add(item);
                var invalid = ProjectTransferRules.ValidateFontEntry(font);
                if (invalid != null) { item.Reason = invalid; result.Warnings.Add($"Font {item.Name}: {invalid}."); continue; }

                var bytes = await ProjectTransferArchive.ReadVerifiedAsync(entries, ProjectTransferRules.FontPath(font.FileName), font.Sha256, ct);
                if (bytes == null) { item.Reason = "file missing or checksum mismatch"; result.Warnings.Add($"Font {item.Name}: file missing or checksum mismatch."); continue; }

                var hash = ProjectTransferRules.Sha256Hex(bytes);
                var exists = await _context.Fonts.AnyAsync(f => f.IsActive &&
                    (f.FileHash == hash || (f.FamilyName == font.Family && f.Weight == font.Weight && f.IsItalic == font.Italic)), ct);
                if (exists) { item.Reason = "already installed"; continue; }

                item.Action = ImportAction.Create;
                item.Reason = "new font";
                fontPlans.Add((font, bytes));
            }

            if (dryRun) return result;

            await ApplyAsync(project, plans.Where(p => p.Item.Action != ImportAction.Skip).ToList(), fontPlans, result, ct);
            result.Applied = true;
            return result;
        }
    }

    private async Task ApplyAsync(
        Project project,
        List<(ManifestTemplate Source, ImportTemplateItem Item, byte[] File, Dictionary<string, byte[]> Assets, Template? Target)> plans,
        List<(ManifestFont Source, byte[] File)> fontPlans,
        ProjectImportResult result,
        CancellationToken ct)
    {
        var ownerId = project.UserId;
        var userId = _user.Id ?? ownerId.ToString();
        var now = DateTime.UtcNow;
        var uploaded = new List<(string Area, string Key)>();
        var deleteAfterCommit = new List<(string Area, string Key)>();
        var fontCacheWrites = new List<(string FileName, byte[] Bytes)>();

        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        try
        {
            foreach (var (source, item, file, assets, target) in plans)
            {
                var isExcel = source.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase);
                var ext = isExcel ? ".xlsx" : ".docx";
                Template template;
                if (target == null)
                {
                    // New template keeps the key from the source deployment, so API callers need no change.
                    template = new Template
                    {
                        Id = Guid.NewGuid(),
                        UserId = ownerId,
                        ProjectId = project.Id,
                        TemplateKey = source.Key,
                        Name = item.Name,
                        CreatedBy = userId,
                        CreatedDatetime = now
                    };
                    _context.Templates.Add(template);
                }
                else
                {
                    template = target;
                    foreach (var v in template.TemplateVersions)
                    {
                        v.Status = "inactive";
                        v.UpdatedBy = userId;
                        v.UpdatedDatetime = now;
                    }
                    template.UpdatedBy = userId;
                    template.UpdatedDatetime = now;
                }

                // Upload builder assets under this deployment's own prefix and point the payload at them.
                var map = new Dictionary<string, string>(StringComparer.Ordinal);
                var assetNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var (oldPath, bytes) in assets)
                {
                    // sandbox-assets/{owner}/{templateId}/... keeps EnsureOwnStoragePaths happy for this template.
                    var key = $"sandbox-assets/{ownerId}/{template.Id}/import-v{source.Version}/{ProjectTransferRules.AssetFileName(oldPath, assetNames)}";
                    using var ms = new MemoryStream(bytes);
                    await _storage.UploadFileAsync(StorageAreas.Reports, key, ms, GuessContentType(key));
                    uploaded.Add((StorageAreas.Reports, key));
                    map[oldPath] = $"minio:{StorageAreas.Reports}/{key}";
                }
                var payloadJson = source.SandboxPayload is { ValueKind: not JsonValueKind.Null and not JsonValueKind.Undefined } p ? p.GetRawText() : null;
                payloadJson = ProjectTransferRules.RewriteStoragePaths(payloadJson, map);

                var objectName = $"{ownerId}/{template.Id}/v{source.Version}{ext}";
                using (var ms = new MemoryStream(file))
                    await _storage.UploadFileAsync(StorageAreas.Templates, objectName, ms,
                        isExcel ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
                uploaded.Add((StorageAreas.Templates, objectName));

                var version = new TemplateVersion
                {
                    Id = Guid.NewGuid(),
                    TemplateId = template.Id,
                    Version = source.Version,
                    FilePath = objectName,
                    SandboxPayload = payloadJson,
                    Status = "active",
                    CreatedBy = userId,
                    CreatedDatetime = now
                };
                version.PreviewFilePath = await TryCreatePreviewAsync(file, isExcel, $"{ownerId}/{template.Id}/v{source.Version}_preview.pdf", uploaded, ct);
                _context.TemplateVersions.Add(version);
                await _context.SaveChangesAsync(ct);

                // Version retention (Free = 1, Pro = 10), same as a normal upload; files go after commit.
                var all = await _context.TemplateVersions.Where(v => v.TemplateId == template.Id).OrderBy(v => v.Version).ToListAsync(ct);
                while (all.Count > _features.MaxTemplateVersions)
                {
                    var oldest = all[0];
                    deleteAfterCommit.Add((StorageAreas.Templates, oldest.FilePath));
                    if (!string.IsNullOrEmpty(oldest.PreviewFilePath)) deleteAfterCommit.Add((StorageAreas.Templates, oldest.PreviewFilePath));
                    _context.TemplateVersions.Remove(oldest);
                    all.RemoveAt(0);
                }
                await _context.SaveChangesAsync(ct);
            }

            foreach (var (source, bytes) in fontPlans)
            {
                var fontId = Guid.NewGuid();
                var key = $"{fontId}/{source.FileName}";
                _context.Fonts.Add(new Font
                {
                    Id = fontId,
                    Name = string.IsNullOrWhiteSpace(source.Name) ? Path.GetFileNameWithoutExtension(source.FileName) : source.Name,
                    FamilyName = string.IsNullOrWhiteSpace(source.Family) ? Path.GetFileNameWithoutExtension(source.FileName) : source.Family,
                    SubFamilyName = string.IsNullOrWhiteSpace(source.SubFamily) ? "Regular" : source.SubFamily,
                    Weight = source.Weight,
                    IsItalic = source.Italic,
                    FileFormat = Path.GetExtension(source.FileName).TrimStart('.').ToLowerInvariant(),
                    FileSizeBytes = bytes.Length,
                    FileHash = ProjectTransferRules.Sha256Hex(bytes),
                    StorageBucket = StorageAreas.Fonts,
                    StorageKey = key,
                    SyncSource = "upload",
                    IsSystemFont = false,
                    IsActive = true,
                    CreatedBy = userId,
                    CreatedDatetime = now
                });
                using var ms = new MemoryStream(bytes);
                await _storage.UploadFileAsync(StorageAreas.Fonts, key, ms, "application/octet-stream");
                uploaded.Add((StorageAreas.Fonts, key));
                fontCacheWrites.Add((source.FileName, bytes));
            }

            await _context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch
        {
            await tx.RollbackAsync(CancellationToken.None);
            foreach (var (area, key) in uploaded)
            {
                try { await _storage.DeleteFileAsync(area, key); }
                catch (Exception ex) { _logger.LogWarning(ex, "[Transfer] Cleanup of {Key} failed", key); }
            }
            throw;
        }

        foreach (var (area, key) in deleteAfterCommit)
        {
            try { await _storage.DeleteFileAsync(area, key); }
            catch (Exception ex) { _logger.LogWarning(ex, "[Transfer] Could not delete old version file {Key}", key); }
        }
        foreach (var (fileName, bytes) in fontCacheWrites)
        {
            try { await _fontCache.WriteAsync(fileName, bytes, ct); }
            catch (Exception ex) { _logger.LogWarning(ex, "[Transfer] Font cache write for {File} failed (font-syncer will pick it up)", fileName); }
        }

        _logger.LogInformation("[Transfer] Imported into project {ProjectId}: {Templates} template change(s), {Fonts} font(s)",
            project.Id, plans.Count, fontPlans.Count);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private async Task<Project> GetOwnedProjectAsync(Guid projectId, CancellationToken ct)
    {
        if (!_features.ProjectTransfer)
            throw new ProFeatureRequiredException("Project export & import");
        if (!Guid.TryParse(_user.Id, out var userId))
            throw new UnauthorizedAccessException();
        return await _context.Projects.FirstOrDefaultAsync(p => p.Id == projectId && p.UserId == userId, ct)
               ?? throw new NotFoundException(nameof(Project), projectId);
    }

    /// <summary>Same checks as a normal upload (incl. the macro/OLE security scan for Word files).</summary>
    private async Task<string?> ValidateTemplateFileAsync(byte[] file, string fileName)
    {
        using var ms = new MemoryStream(file);
        var validation = fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase)
            ? await _excel.ValidateTemplateAsync(ms)
            : await _docx.ValidateTemplateAsync(ms);
        return validation.IsValid ? null : string.Join("; ", validation.Errors);
    }

    private async Task<string?> TryCreatePreviewAsync(byte[] file, bool isExcel, string objectName, List<(string, string)> uploaded, CancellationToken ct)
    {
        try
        {
            using var source = new MemoryStream(file);
            byte[] pdf;
            if (isExcel)
            {
                using var withGrid = ExcelGridlineHelper.AddGridlineBorders(source);
                pdf = await _gotenberg.ConvertDocxToPdfAsync(withGrid, ct);
            }
            else
            {
                using var processed = await _docx.PreprocessForPreviewAsync(source, ct);
                pdf = await _gotenberg.ConvertDocxToPdfAsync(processed, ct);
            }
            using var pdfStream = new MemoryStream(pdf);
            await _storage.UploadFileAsync(StorageAreas.Templates, objectName, pdfStream, "application/pdf");
            uploaded.Add((StorageAreas.Templates, objectName));
            return objectName;
        }
        catch (Exception ex)
        {
            // The template still works without a thumbnail; it is created on the next upload.
            _logger.LogWarning(ex, "[Transfer] Preview for {Object} could not be generated", objectName);
            return null;
        }
    }

    private async Task<byte[]> ReadAllAsync(string area, string key)
    {
        await using var stream = await _storage.DownloadFileAsync(area, key);
        if (stream is MemoryStream m) return m.ToArray();
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms);
        return ms.ToArray();
    }

    private static async Task WriteEntryAsync(ZipArchive zip, string path, byte[] bytes, CancellationToken ct)
    {
        var entry = zip.CreateEntry(path, CompressionLevel.Optimal);
        await using var stream = entry.Open();
        await stream.WriteAsync(bytes, ct);
    }

    private static JsonElement? ParsePayload(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload)) return null;
        try { using var doc = JsonDocument.Parse(payload); return doc.RootElement.Clone(); }
        catch (JsonException) { return null; }
    }

    private static void Skip(ImportTemplateItem item, string reason, ProjectImportResult result)
    {
        item.Action = ImportAction.Skip;
        item.Reason = reason;
        result.Warnings.Add($"{item.Key}: {reason}.");
    }

    private static string GuessContentType(string key) => Path.GetExtension(key).ToLowerInvariant() switch
    {
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".svg" => "image/svg+xml",
        _ => "application/octet-stream"
    };
}
