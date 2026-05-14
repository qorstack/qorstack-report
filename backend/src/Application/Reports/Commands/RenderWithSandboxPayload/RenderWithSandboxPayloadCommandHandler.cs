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
    private readonly ISandboxAssetService _assetService;
    private readonly string _reportBucket;

    public RenderWithSandboxPayloadCommandHandler(
        IApplicationDbContext context,
        ISender mediator,
        ILogger<RenderWithSandboxPayloadCommandHandler> _logger,
        IUser user,
        IMinioStorageService storageService,
        ISandboxAssetService assetService,
        IConfiguration configuration)
    {
        _context = context;
        _mediator = mediator;
        this._logger = _logger;
        _user = user;
        _storageService = storageService;
        _assetService = assetService;
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

            // Normalize presigned URLs → minio: paths, then upload any base64 → MinIO
            _assetService.ConvertPresignedUrlsToMinioPaths(data);
            var assetPrefix = $"sandbox-assets/{request.UserId}/{template.Id}";
            await _assetService.ReplaceBase64WithMinioUrlsAsync(data, assetPrefix);

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
                IsSandbox = true,
                PdfPassword = data.PdfPassword,
                Watermark = data.Watermark
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
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
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rendering with sandbox payload for '{TemplateKey}'", request.TemplateKey);
            throw new ThrowException(ex, new Exception($"Error rendering with sandbox payload for '{request.TemplateKey}'."), _logger);
        }
    }

}
