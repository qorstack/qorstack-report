using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Infrastructure.Services.Document.Processors;

namespace QorstackReportService.Infrastructure.Services.Document;

/// <summary>
/// Shared sandbox asset handler used by both PDF and Excel render flows.
/// Eliminates duplication in base64 upload, URL normalization, and image optimization.
/// </summary>
public class SandboxAssetService : ISandboxAssetService
{
    private readonly IMinioStorageService _storage;
    private readonly ILogger<SandboxAssetService> _logger;
    private readonly string _reportBucket;

    public SandboxAssetService(
        IMinioStorageService storage,
        IConfiguration config,
        ILogger<SandboxAssetService> logger)
    {
        _storage = storage;
        _logger = logger;
        _reportBucket = config["Minio:ReportBucket"] ?? "reports";
    }

    public void ConvertPresignedUrlsToMinioPaths(DocumentProcessingData data)
    {
        foreach (var kvp in data.Image)
        {
            if (kvp.Value?.Src == null) continue;
            var minioPath = _storage.TryConvertToMinioPath(kvp.Value.Src);
            if (minioPath != null) kvp.Value.Src = minioPath;
        }

        foreach (var kvp in data.Qrcode)
        {
            if (kvp.Value?.Logo == null) continue;
            var minioPath = _storage.TryConvertToMinioPath(kvp.Value.Logo);
            if (minioPath != null) kvp.Value.Logo = minioPath;
        }
    }

    public async Task ReplaceBase64WithMinioUrlsAsync(DocumentProcessingData data, string prefix)
    {
        foreach (var kvp in data.Image)
        {
            if (kvp.Value == null || !IsBase64(kvp.Value.Src)) continue;
            kvp.Value.Src = await UploadAsync(
                kvp.Value.Src,
                prefix,
                $"img_{kvp.Key}",
                kvp.Value.Width ?? 0,
                kvp.Value.Height ?? 0);
        }

        foreach (var kvp in data.Qrcode)
        {
            if (kvp.Value?.Logo == null || !IsBase64(kvp.Value.Logo)) continue;
            kvp.Value.Logo = await UploadAsync(
                kvp.Value.Logo,
                prefix,
                $"qr_logo_{kvp.Key}",
                kvp.Value.Size,
                kvp.Value.Size);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<string> UploadAsync(string base64Value, string prefix, string name,
        int targetWidthPx, int targetHeightPx)
    {
        var bytes = DecodeBase64(base64Value);

        // Optimize: resize + re-encode to reduce file size (typically 40-80% smaller)
        var optimized = ImageOptimizer.OptimizeImage(bytes, targetWidthPx, targetHeightPx, _logger);
        var ext = DetectImageExtension(optimized);
        var objectName = $"{prefix}/{name}.{ext}";

        using var stream = new MemoryStream(optimized);
        await _storage.UploadFileAsync(_reportBucket, objectName, stream, $"image/{ext}");

        return $"minio:{_reportBucket}/{objectName}";
    }

    private static bool IsBase64(string? value)
    {
        if (string.IsNullOrEmpty(value)) return false;
        if (value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            value.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            value.StartsWith("minio:", StringComparison.OrdinalIgnoreCase)) return false;
        return value.StartsWith("data:", StringComparison.OrdinalIgnoreCase) || value.Length > 200;
    }

    private static byte[] DecodeBase64(string src)
    {
        if (src.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            var commaIndex = src.IndexOf(',');
            if (commaIndex > 0) src = src[(commaIndex + 1)..];
        }
        return Convert.FromBase64String(src);
    }

    private static string DetectImageExtension(byte[] bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) return "jpg";
        if (bytes.Length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50) return "png";
        if (bytes.Length >= 4 && bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46) return "gif";
        return "png";
    }
}
