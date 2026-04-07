using System.Security.Cryptography;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Fonts.Models;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Fonts.Commands.UploadFont;

public class UploadFontCommandHandler : IRequestHandler<UploadFontCommand, FontDetailDto>
{
    private static readonly string[] AllowedExtensions = [".ttf", ".otf", ".woff", ".woff2"];
    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storage;
    private readonly IConfiguration _configuration;
    private readonly ILogger<UploadFontCommandHandler> _logger;

    public UploadFontCommandHandler(
        IApplicationDbContext context,
        IMinioStorageService storage,
        IConfiguration configuration,
        ILogger<UploadFontCommandHandler> logger)
    {
        _context = context;
        _storage = storage;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<FontDetailDto> Handle(UploadFontCommand command, CancellationToken ct)
    {
        // --- Validate project access ---
        var hasAccess = await _context.Projects
            .AnyAsync(p => p.Id == command.ProjectId &&
                (p.UserId == command.UserId ||
                 p.ProjectMembers.Any(m => m.UserId == command.UserId && m.IsActive)), ct);

        if (!hasAccess)
            throw new NotFoundException("Project", command.ProjectId);

        // --- Validate file ---
        var ext = Path.GetExtension(command.File.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            throw new DataValidationException($"Unsupported font format '{ext}'. Allowed: ttf, otf, woff, woff2");

        if (command.File.Length > MaxFileSizeBytes)
            throw new DataValidationException($"Font file exceeds maximum size of 10 MB");

        // --- Compute SHA-256 hash ---
        byte[] fileBytes;
        using (var ms = new MemoryStream())
        {
            await command.File.CopyToAsync(ms, ct);
            fileBytes = ms.ToArray();
        }
        var hash = Convert.ToHexString(SHA256.HashData(fileBytes)).ToLowerInvariant();

        // --- Check existing font by hash ---
        var existingFont = await _context.Fonts
            .FirstOrDefaultAsync(f => f.FileHash == hash && f.IsActive, ct);

        if (existingFont != null)
        {
            // Font already exists in system — check if this project already owns it
            var existingOwnership = await _context.FontOwnerships
                .FirstOrDefaultAsync(o => o.FontId == existingFont.Id && o.ProjectId == command.ProjectId, ct);

            if (existingOwnership != null)
            {
                // Idempotent — project already owns this font
                var downloadUrl = await GetDownloadUrlAsync(existingFont);
                return MapToDetail(existingFont, existingOwnership, downloadUrl);
            }

            // Different project — create new ownership pointing to existing font record (no re-upload)
            var newOwnership = new FontOwnership
            {
                Id = Guid.NewGuid(),
                FontId = existingFont.Id,
                ProjectId = command.ProjectId,
                UploadedByUserId = command.UserId,
                LicenseNote = command.LicenseNote,
                IsActive = true,
                CreatedBy = command.UserId.ToString(),
                CreatedDatetime = DateTime.UtcNow,
            };

            _context.FontOwnerships.Add(newOwnership);
            await _context.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Font {FontId} already exists (hash dedup) — created new ownership for project {ProjectId}",
                existingFont.Id, command.ProjectId);

            var downloadUrl2 = await GetDownloadUrlAsync(existingFont);
            return MapToDetail(existingFont, newOwnership, downloadUrl2);
        }

        // --- New font: upload + insert ---
        var fontId = Guid.NewGuid();
        var fileName = command.File.FileName;
        var fontBucket = _configuration["Minio:FontBucket"] ?? "fonts";
        var storageKey = $"{fontId}/{fileName}";
        var meta = ReadFontMeta(fileName);

        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        try
        {
            var font = new Font
            {
                Id = fontId,
                Name = meta.Name,
                FamilyName = meta.FamilyName,
                SubFamilyName = meta.SubFamilyName,
                Weight = meta.Weight,
                IsItalic = meta.IsItalic,
                FileFormat = ext.TrimStart('.'),
                FileSizeBytes = fileBytes.Length,
                FileHash = hash,
                StorageBucket = fontBucket,
                StorageKey = storageKey,
                SyncSource = "upload",
                IsSystemFont = false,
                IsActive = true,
                CreatedBy = command.UserId.ToString(),
                CreatedDatetime = DateTime.UtcNow,
            };

            var ownership = new FontOwnership
            {
                Id = Guid.NewGuid(),
                FontId = fontId,
                ProjectId = command.ProjectId,
                UploadedByUserId = command.UserId,
                LicenseNote = command.LicenseNote,
                IsActive = true,
                CreatedBy = command.UserId.ToString(),
                CreatedDatetime = DateTime.UtcNow,
            };

            _context.Fonts.Add(font);
            _context.FontOwnerships.Add(ownership);
            await _context.SaveChangesAsync(ct);

            // Upload to Minio after DB insert succeeds
            await _storage.EnsureBucketExistsAsync(fontBucket);
            using var uploadStream = new MemoryStream(fileBytes);
            await _storage.UploadFileAsync(fontBucket, storageKey, uploadStream, "application/octet-stream");

            await tx.CommitAsync(ct);

            _logger.LogInformation("Font {FontId} uploaded by user {UserId} for project {ProjectId}",
                fontId, command.UserId, command.ProjectId);

            var downloadUrl = await _storage.GetPresignedUrlAsync(fontBucket, storageKey, 3600);
            return MapToDetail(font, ownership, downloadUrl);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to upload font for project {ProjectId}", command.ProjectId);
            throw;
        }
    }

    private async Task<string?> GetDownloadUrlAsync(Font font)
    {
        if (font.StorageBucket == null)
            return null; // system font stored locally

        try
        {
            return await _storage.GetPresignedUrlAsync(font.StorageBucket, font.StorageKey, 3600);
        }
        catch
        {
            return null;
        }
    }

    private static (string Name, string FamilyName, string SubFamilyName, short Weight, bool IsItalic) ReadFontMeta(string fileName)
    {
        var baseName = Path.GetFileNameWithoutExtension(fileName);
        var bracketIndex = baseName.IndexOf('[');
        if (bracketIndex > 0) baseName = baseName[..bracketIndex];

        var dashIndex = baseName.IndexOf('-');
        if (dashIndex < 0)
            return (baseName, baseName, "Regular", 400, false);

        var family = baseName[..dashIndex];
        var style = baseName[(dashIndex + 1)..];

        var (weightInt, isItalic) = style.ToLowerInvariant() switch
        {
            "thin"             => (100, false),
            "thinitalic"       => (100, true),
            "extralight"       => (200, false),
            "extralightitalic" => (200, true),
            "light"            => (300, false),
            "lightitalic"      => (300, true),
            "regular"          => (400, false),
            "italic"           => (400, true),
            "medium"           => (500, false),
            "mediumitalic"     => (500, true),
            "semibold"         => (600, false),
            "semibolditalic"   => (600, true),
            "bold"             => (700, false),
            "bolditalic"       => (700, true),
            "extrabold"        => (800, false),
            "extrabolditalic"  => (800, true),
            "black"            => (900, false),
            "blackitalic"      => (900, true),
            _ => (400, style.Contains("italic", StringComparison.OrdinalIgnoreCase)),
        };

        return ($"{family} {style}", family, style, (short)weightInt, isItalic);
    }

    private static FontDetailDto MapToDetail(Font font, FontOwnership ownership, string? downloadUrl) => new()
    {
        Id = font.Id,
        Name = font.Name,
        FamilyName = font.FamilyName,
        SubFamilyName = font.SubFamilyName,
        Weight = font.Weight,
        IsItalic = font.IsItalic,
        FileFormat = font.FileFormat,
        FileSizeBytes = font.FileSizeBytes,
        IsSystemFont = font.IsSystemFont,
        AccessType = "owner",
        CreatedDatetime = font.CreatedDatetime,
        OwnershipId = ownership.Id,
        LicenseNote = ownership.LicenseNote,
        DownloadUrl = downloadUrl,
    };
}
