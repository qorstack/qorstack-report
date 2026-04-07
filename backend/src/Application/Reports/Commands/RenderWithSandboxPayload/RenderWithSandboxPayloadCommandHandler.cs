using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Reports.Commands.ExportPdf;
using QorstackReportService.Application.Reports.Models;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Reports.Commands.RenderWithSandboxPayload;

/// <summary>
/// Handler for RenderWithSandboxPayloadCommand
/// </summary>
public class RenderWithSandboxPayloadCommandHandler : IRequestHandler<RenderWithSandboxPayloadCommand, RenderResult>
{
    private readonly IApplicationDbContext _context;
    private readonly ISender _mediator;
    private readonly ILogger<RenderWithSandboxPayloadCommandHandler> _logger;
    private readonly IUser _user;
    private readonly IMinioStorageService _storageService;
    private readonly string _reportBucket;

    public RenderWithSandboxPayloadCommandHandler(
        IApplicationDbContext context,
        ISender mediator,
        ILogger<RenderWithSandboxPayloadCommandHandler> _logger,
        IUser user,
        IMinioStorageService storageService,
        IConfiguration configuration)
    {
        _context = context;
        _mediator = mediator;
        this._logger = _logger;
        _user = user;
        _storageService = storageService;
        _reportBucket = configuration["Minio:ReportBucket"] ?? "reports";
    }

    public async Task<RenderResult> Handle(RenderWithSandboxPayloadCommand request, CancellationToken cancellationToken)
    {
        ExportPdfCommand exportCommand;

        // 1. Update Sandbox Payload
        // Removed explicit transaction to avoid connection blocking/timeouts when calling ExportPdfCommand later.
        // SaveChangesAsync is atomic enough for this single update operation.
        try
        {
            _logger.LogInformation("Rendering PDF from template {TemplateKey} using sandbox payload for user {UserId}",
            request.TemplateKey, request.UserId);

            // Get template with sandbox payload and active version
            var template = await _context.Templates
                .Include(t => t.TemplateVersions)
                .FirstOrDefaultAsync(t => t.TemplateKey == request.TemplateKey && t.UserId == request.UserId, cancellationToken);

            if (template == null)
            {
                throw new KeyNotFoundException($"Template with key {request.TemplateKey} not found.");
            }

            var activeVersion = template.TemplateVersions.FirstOrDefault(v => v.Status == "active");
            if (activeVersion == null)
            {
                throw new InvalidOperationException("No active template version found");
            }

            // Update sandbox payload if provided
            if (request.SandboxPayload != null)
            {
                var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = false };
                activeVersion.SandboxPayload = JsonSerializer.Serialize(request.SandboxPayload, options);

                Console.WriteLine($"[RenderWithSandboxPayload] Saving Payload: {activeVersion.SandboxPayload}");

                activeVersion.UpdatedBy = _user.Id;
                activeVersion.UpdatedDatetime = DateTime.UtcNow;

                // Also update template timestamp for visibility
                template.UpdatedBy = _user.Id;
                template.UpdatedDatetime = DateTime.UtcNow;

                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Updated sandbox payload for template {TemplateKey} version {Version}", request.TemplateKey, activeVersion.Version);
            }

            // Fallback to template payload if version payload is empty (migration support)
            // Since we removed SandboxPayload from Template, we can only rely on ActiveVersion.
            var payloadJson = activeVersion.SandboxPayload;

            if (string.IsNullOrEmpty(payloadJson))
            {
                throw new ValidationException("Active template version does not have sandbox payload configured");
            }

            // Parse sandbox payload only if we didn't just receive it
            DocumentProcessingData data;
            if (request.SandboxPayload != null)
            {
                data = request.SandboxPayload.Deserialize<DocumentProcessingData>(new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? new DocumentProcessingData();
            }
            else
            {
                try
                {
                    data = JsonSerializer.Deserialize<DocumentProcessingData>(payloadJson, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    }) ?? new DocumentProcessingData();
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "Failed to parse sandbox payload for template {TemplateKey}", request.TemplateKey);
                    throw new ValidationException("Invalid sandbox payload format");
                }
            }

            // Convert any presigned URLs back to minio: paths (frontend may send expired/expiring presigned URLs)
            ConvertPresignedUrlsToMinioPaths(data);

            // Upload base64 images to MinIO and replace with public URLs
            await ReplaceBase64WithMinioUrlsAsync(data, request.UserId, template.Id);

            // Re-serialize payload with URLs instead of base64 for DB storage
            var serializeOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = false };
            activeVersion.SandboxPayload = JsonSerializer.Serialize(data, serializeOptions);
            await _context.SaveChangesAsync(cancellationToken);

            // Construct command inside here
            exportCommand = new ExportPdfCommand
            {
                UserId = request.UserId,
                TemplateKey = request.TemplateKey,
                Async = request.Async,
                Data = data,
                IsSandbox = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating sandbox payload for '{TemplateKey}'", request.TemplateKey);
            throw new ThrowException(ex, new Exception($"Error updating sandbox payload for '{request.TemplateKey}'."), _logger);
        }

        // 2. Execute Export (Outside of previous scope)
        try
        {
            // Execute export
            var result = await _mediator.Send(exportCommand, cancellationToken);

            _logger.LogInformation("Successfully rendered PDF from template {TemplateKey} using sandbox payload", request.TemplateKey);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rendering with sandbox payload for '{TemplateKey}'", request.TemplateKey);
            throw new ThrowException(ex, new Exception($"Error rendering with sandbox payload for '{request.TemplateKey}'."), _logger);
        }
    }

    private async Task ReplaceBase64WithMinioUrlsAsync(DocumentProcessingData data, Guid userId, Guid templateId)
    {
        var prefix = $"sandbox-assets/{userId}/{templateId}";

        await ReplaceBase64ImagesAsync(data, prefix);
        await ReplaceBase64QrLogosAsync(data, prefix);
    }

    private async Task ReplaceBase64ImagesAsync(DocumentProcessingData data, string prefix)
    {
        if (data.Image == null) return;

        foreach (var kvp in data.Image)
        {
            if (kvp.Value == null || !IsBase64(kvp.Value.Src)) continue;

            kvp.Value.Src = await UploadBase64ToMinioAsync(kvp.Value.Src, prefix, $"img_{kvp.Key}");
        }
    }

    private async Task ReplaceBase64QrLogosAsync(DocumentProcessingData data, string prefix)
    {
        if (data.Qrcode == null) return;

        foreach (var kvp in data.Qrcode)
        {
            if (kvp.Value?.Logo == null || !IsBase64(kvp.Value.Logo)) continue;

            kvp.Value.Logo = await UploadBase64ToMinioAsync(kvp.Value.Logo, prefix, $"qr_logo_{kvp.Key}");
        }
    }

    private async Task<string> UploadBase64ToMinioAsync(string base64Value, string prefix, string name)
    {
        var bytes = DecodeBase64(base64Value);
        var ext = DetectImageExtension(bytes);
        var objectName = $"{prefix}/{name}.{ext}";

        using var stream = new MemoryStream(bytes);
        await _storageService.UploadFileAsync(_reportBucket, objectName, stream, $"image/{ext}");

        // Store as minio: path — will be resolved to presigned URL when serving to frontend
        return $"minio:{_reportBucket}/{objectName}";
    }

    private void ConvertPresignedUrlsToMinioPaths(DocumentProcessingData data)
    {
        if (data.Image != null)
        {
            foreach (var kvp in data.Image)
            {
                if (kvp.Value?.Src == null) continue;
                var minioPath = _storageService.TryConvertToMinioPath(kvp.Value.Src);
                if (minioPath != null)
                {
                    kvp.Value.Src = minioPath;
                }
            }
        }

        if (data.Qrcode != null)
        {
            foreach (var kvp in data.Qrcode)
            {
                if (kvp.Value?.Logo == null) continue;
                var minioPath = _storageService.TryConvertToMinioPath(kvp.Value.Logo);
                if (minioPath != null)
                {
                    kvp.Value.Logo = minioPath;
                }
            }
        }
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
        return "png"; // default
    }
}
