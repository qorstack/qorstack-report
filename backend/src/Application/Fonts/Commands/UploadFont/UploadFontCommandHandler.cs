using System.Security.Cryptography;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
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
    private readonly IGotenbergFontCache _fontCache;
    private readonly IConfiguration _configuration;
    private readonly ILogger<UploadFontCommandHandler> _logger;

    public UploadFontCommandHandler(
        IApplicationDbContext context,
        IMinioStorageService storage,
        IGotenbergFontCache fontCache,
        IConfiguration configuration,
        ILogger<UploadFontCommandHandler> logger)
    {
        _context = context;
        _storage = storage;
        _fontCache = fontCache;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<FontDetailDto> Handle(UploadFontCommand command, CancellationToken ct)
    {
        // --- Validate file ---
        var ext = Path.GetExtension(command.File.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            throw new Common.Exceptions.DataValidationException($"Unsupported font format '{ext}'. Allowed: ttf, otf, woff, woff2");

        if (command.File.Length > MaxFileSizeBytes)
            throw new Common.Exceptions.DataValidationException("Font file exceeds maximum size of 10 MB");

        // --- Compute SHA-256 hash ---
        byte[] fileBytes;
        using (var ms = new MemoryStream())
        {
            await command.File.CopyToAsync(ms, ct);
            fileBytes = ms.ToArray();
        }
        var hash = Convert.ToHexString(SHA256.HashData(fileBytes)).ToLowerInvariant();

        // --- Dedup: return existing font if same hash ---
        var existingFont = await _context.Fonts
            .FirstOrDefaultAsync(f => f.FileHash == hash && f.IsActive, ct);

        if (existingFont != null)
        {
            _logger.LogInformation("Font already exists (hash dedup) — {FontId}", existingFont.Id);
            var downloadUrl = await GetDownloadUrlAsync(existingFont);
            return MapToDetail(existingFont, downloadUrl);
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

            _context.Fonts.Add(font);
            await _context.SaveChangesAsync(ct);

            // Upload to Minio after DB insert succeeds
            await _storage.EnsureBucketExistsAsync(fontBucket);
            using var uploadStream = new MemoryStream(fileBytes);
            await _storage.UploadFileAsync(fontBucket, storageKey, uploadStream, "application/octet-stream");

            // Write to shared Gotenberg fonts volume so LibreOffice can use it immediately
            await _fontCache.WriteAsync(fileName, fileBytes, ct);

            await tx.CommitAsync(ct);

            _logger.LogInformation("Font {FontId} uploaded by user {UserId}", fontId, command.UserId);

            var downloadUrl = await _storage.GetPresignedUrlAsync(fontBucket, storageKey, 3600);
            return MapToDetail(font, downloadUrl);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to upload font");
            throw;
        }
    }

    private async Task<string?> GetDownloadUrlAsync(Font font)
    {
        if (font.StorageBucket == null)
            return null;

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

    private static FontDetailDto MapToDetail(Font font, string? downloadUrl) => new()
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
        AccessType = font.IsSystemFont ? "system" : "uploaded",
        CreatedDatetime = font.CreatedDatetime,
        DownloadUrl = downloadUrl,
    };
}
