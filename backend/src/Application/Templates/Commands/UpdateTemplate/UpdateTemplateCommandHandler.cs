using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Helpers;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Templates.Models;
using QorstackReportService.Domain.Entities;
using QorstackReportService.Domain.Enums;

namespace QorstackReportService.Application.Templates.Commands.UpdateTemplate;

/// <summary>
/// Handler for UpdateTemplateCommand
/// </summary>
public class UpdateTemplateCommandHandler : IRequestHandler<UpdateTemplateCommand, TemplateDetailResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;
    private readonly ILogger<UpdateTemplateCommandHandler> _logger;
    private readonly IMinioStorageService _storageService;
    private readonly IDocxProcessingService _docxService;
    private readonly IExcelProcessingService _excelService;
    private readonly IGotenbergService _gotenbergService;
    private readonly IFeatureFlagService _featureFlags;

    private readonly string _templateBucket;
    private readonly IConfiguration _configuration;

    public UpdateTemplateCommandHandler(
        IApplicationDbContext context,
        IUser user,
        ILogger<UpdateTemplateCommandHandler> logger,
        IMinioStorageService storageService,
        IDocxProcessingService docxService,
        IExcelProcessingService excelService,
        IGotenbergService gotenbergService,
        IFeatureFlagService featureFlags,
        IConfiguration configuration)
    {
        _context = context;
        _user = user;
        _logger = logger;
        _storageService = storageService;
        _docxService = docxService;
        _excelService = excelService;
        _gotenbergService = gotenbergService;
        _featureFlags = featureFlags;
        _configuration = configuration;
        _templateBucket = configuration["Minio:TemplateBucket"] ?? "templates";
    }

    public async Task<TemplateDetailResponse> Handle(UpdateTemplateCommand request, CancellationToken cancellationToken)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            _logger.LogInformation("Updating template {TemplateKey} for user {UserId}",
                request.TemplateKey, request.UserId);

            var template = await _context.Templates
                .FirstOrDefaultAsync(t => t.TemplateKey == request.TemplateKey && t.UserId == request.UserId, cancellationToken);

            if (template == null)
            {
                throw new KeyNotFoundException($"Template with key {request.TemplateKey} not found.");
            }

            // Get current active version
            var activeVersion = await _context.TemplateVersions
                .FirstOrDefaultAsync(v => v.TemplateId == template.Id && v.Status == "active", cancellationToken);

            // Update fields if provided
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                template.Name = request.Name;
            }

            if (request.ProjectId != null)
            {
                var projectExists = await _context.Projects
                    .AnyAsync(p => p.Id == request.ProjectId.Value && p.UserId == request.UserId, cancellationToken);
                if (!projectExists)
                    throw new NotFoundException(nameof(Project), request.ProjectId.Value);

                template.ProjectId = request.ProjectId;
            }

            // Update SandboxPayload on Active Version if provided and no new file (if new file, we handle it below)
            if (request.SandboxPayload != null && request.File == null && activeVersion != null)
            {
                // Normalize any presigned URLs back to minio: paths before persisting.
                // The frontend may send stale/fresh presigned URLs; we always store the
                // immutable minio: path so URLs can be regenerated on each GET.
                activeVersion.SandboxPayload = NormalizePayloadUrls(request.SandboxPayload);
                activeVersion.UpdatedBy = _user.Id;
                activeVersion.UpdatedDatetime = DateTime.UtcNow;
            }

            if (request.File != null)
            {
                _logger.LogInformation("Updating template {TemplateKey} with new file upload", request.TemplateKey);

                // Detect file type from extension (mirrors UploadTemplateCommandHandler)
                var uploadedFileName = request.File.FileName;
                var fileExtension = Path.GetExtension(uploadedFileName)?.ToLowerInvariant() ?? ".docx";
                var isExcel = fileExtension is ".xlsx" or ".xls";

                // Validate + extract markers using the right service for this file type
                using var fileStream = request.File.OpenReadStream();
                TemplateValidationResult validationResult;
                List<TemplateMarker> markers;

                if (isExcel)
                {
                    validationResult = await _excelService.ValidateTemplateAsync(fileStream);
                    fileStream.Position = 0;
                    markers = await _excelService.ExtractMarkersAsync(fileStream);
                }
                else
                {
                    validationResult = await _docxService.ValidateTemplateAsync(fileStream);
                    fileStream.Position = 0;
                    markers = await _docxService.ExtractMarkersAsync(fileStream);
                }

                if (!validationResult.IsValid)
                {
                    var errors = string.Join("; ", validationResult.Errors);
                    _logger.LogWarning("Template validation failed: {Errors}", errors);
                    throw new ValidationException($"Invalid template: {errors}");
                }

                fileStream.Position = 0;

                // Prepare Sandbox Payload for new version
                string? newPayload = null;

                // Use request payload if provided, otherwise use current active version payload.
                // Fallback to null if no active version (shouldn't happen for existing template with file).
                var currentPayload = request.SandboxPayload ?? activeVersion?.SandboxPayload;

                // Auto-detect variables from template markers (always enabled — free feature).
                // Only sync when markers were actually found; if extraction returned empty
                // (e.g. partial failure), preserve the existing payload to avoid data loss.
                if (markers.Count > 0)
                {
                    bool hasPayload = !string.IsNullOrEmpty(currentPayload);
                    newPayload = PayloadHelper.SyncPayloadWithMarkers(
                        currentPayload,
                        markers,
                        deleteUnused: true,
                        preserveOrder: hasPayload);
                }
                else
                {
                    newPayload = currentPayload;
                }

                // Get current max version
                var currentMaxVersion = await _context.TemplateVersions
                    .Where(v => v.TemplateId == template.Id)
                    .MaxAsync(v => (int?)v.Version) ?? 0;

                var newVersion = currentMaxVersion + 1;

                // Deactivate old versions
                var oldVersions = await _context.TemplateVersions
                    .Where(v => v.TemplateId == template.Id && v.Status == "active")
                    .ToListAsync(cancellationToken);

                foreach (var version in oldVersions)
                {
                    version.Status = "inactive";
                    version.UpdatedBy = _user.Id;
                    version.UpdatedDatetime = DateTime.UtcNow;
                }

                // Create new version
                var versionId = Guid.NewGuid();
                var objectName = $"{request.UserId}/{template.Id}/v{newVersion}{fileExtension}";

                var templateVersion = new TemplateVersion
                {
                    Id = versionId,
                    TemplateId = template.Id,
                    Version = newVersion,
                    FilePath = objectName,
                    SandboxPayload = newPayload,
                    Status = "active",
                    CreatedBy = _user.Id,
                    CreatedDatetime = DateTime.UtcNow
                };

                _context.TemplateVersions.Add(templateVersion);

                // Prepare independent streams for parallel execution
                var previewStream = new MemoryStream();
                fileStream.Position = 0;
                await fileStream.CopyToAsync(previewStream, cancellationToken);
                previewStream.Position = 0;
                fileStream.Position = 0;

                var contentType = isExcel
                    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

                // Task 1: Upload Original File
                var uploadTask = _storageService.UploadFileAsync(
                    _templateBucket,
                    objectName,
                    fileStream,
                    contentType);

                // Task 2: Generate PDF preview — Excel gets gridline borders first, DOCX gets preprocessed
                var previewTask = Task.Run(async () =>
                {
                    byte[] pdfBytes;
                    if (isExcel)
                    {
                        using var withGridlines = ExcelGridlineHelper.AddGridlineBorders(previewStream);
                        pdfBytes = await _gotenbergService.ConvertDocxToPdfAsync(withGridlines, cancellationToken);
                    }
                    else
                    {
                        using var processedDocx = await _docxService.PreprocessForPreviewAsync(previewStream, cancellationToken);
                        pdfBytes = await _gotenbergService.ConvertDocxToPdfAsync(processedDocx, cancellationToken);
                    }

                    var previewObjectName = $"{request.UserId}/{template.Id}/v{newVersion}_preview.pdf";
                    using var pdfStream = new MemoryStream(pdfBytes);
                    await _storageService.UploadFileAsync(
                        _templateBucket, previewObjectName, pdfStream, "application/pdf");

                    templateVersion.PreviewFilePath = previewObjectName;
                    _logger.LogInformation("Generated and uploaded preview: {PreviewPath}", previewObjectName);
                }, cancellationToken);

                await Task.WhenAll(uploadTask, previewTask);

                _logger.LogDebug("File uploaded to MinIO successfully: {ObjectName}", objectName);

                // Persist the new version so the retention query below sees it — otherwise
                // ToListAsync hits the DB which doesn't yet include the tracked-but-unsaved row,
                // and the "> maxVersions" check fails, leaving us with maxVersions+1 rows.
                await _context.SaveChangesAsync(cancellationToken);

                // Enforce version retention limit — keep the newest N versions (including the one just added)
                var maxVersions = _featureFlags.MaxTemplateVersions;
                var allVersionsList = await _context.TemplateVersions
                    .Where(v => v.TemplateId == template.Id)
                    .OrderBy(v => v.Version)
                    .ToListAsync(cancellationToken);

                while (allVersionsList.Count > maxVersions)
                {
                    var oldest = allVersionsList[0];

                    try { await _storageService.DeleteFileAsync(_templateBucket, oldest.FilePath); }
                    catch (Exception ex) { _logger.LogWarning(ex, "Failed to delete old template file {Path}", oldest.FilePath); }

                    if (!string.IsNullOrEmpty(oldest.PreviewFilePath))
                    {
                        try { await _storageService.DeleteFileAsync(_templateBucket, oldest.PreviewFilePath); }
                        catch { /* non-fatal */ }
                    }

                    _context.TemplateVersions.Remove(oldest);
                    allVersionsList.RemoveAt(0);
                }
            }

            template.UpdatedBy = _user.Id;
            template.UpdatedDatetime = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("Successfully updated template {TemplateKey}", request.TemplateKey);

            // Get all versions for response (reload to get latest state)
            var allVersions = await _context.TemplateVersions
                .Where(v => v.TemplateId == template.Id)
                .OrderByDescending(v => v.Version)
                .Select(v => new TemplateVersionResponse
                {
                    Id = v.Id,
                    TemplateId = v.TemplateId,
                    Version = v.Version,
                    FilePath = v.FilePath,
                    PreviewFilePath = v.PreviewFilePath,
                    Status = v.Status,
                    CreatedBy = v.CreatedBy,
                    CreatedDatetime = v.CreatedDatetime
                })
                .ToListAsync(cancellationToken);

            foreach (var v in allVersions)
            {
                if (!string.IsNullOrEmpty(v.PreviewFilePath))
                {
                    try
                    {
                        v.PreviewFilePathPresigned = await _storageService.GetPresignedUrlAsync(
                            _templateBucket,
                            v.PreviewFilePath,
                            3600);
                    }
                    catch
                    {
                        // Ignore errors
                    }
                }
            }

            var currentActiveVersion = allVersions.FirstOrDefault(v => v.Status == "active");

            // Re-fetch active version entity to get Payload if needed, or use what we likely set
            // Optimization: We know what we set. But let's rely on standard flow.
            var activeVersionEntity = await _context.TemplateVersions
                 .FirstOrDefaultAsync(v => v.TemplateId == template.Id && v.Status == "active", cancellationToken);

            var response = new TemplateDetailResponse
            {
                Id = template.Id,
                UserId = template.UserId,
                ProjectId = template.ProjectId,
                TemplateKey = template.TemplateKey,
                Name = template.Name,
                SandboxPayload = activeVersionEntity?.SandboxPayload,
                ActiveVersion = currentActiveVersion,
                AllVersions = allVersions,
                CreatedBy = template.CreatedBy,
                CreatedDatetime = template.CreatedDatetime,
                UpdatedBy = template.UpdatedBy,
                UpdatedDatetime = template.UpdatedDatetime
            };

            // Sandbox Last Test Presigned URL
            var reportBucket = _configuration["Minio:ReportBucket"] ?? "reports";

            // Use version specific sandbox path if available
            if (activeVersionEntity?.SandboxFilePath != null)
            {
                 try
                {
                    if (await _storageService.FileExistsAsync(reportBucket, activeVersionEntity.SandboxFilePath))
                    {
                        response.FileSandboxLastTestPresigned = await _storageService.GetPresignedUrlAsync(
                            reportBucket,
                            activeVersionEntity.SandboxFilePath,
                            3600);
                    }
                }
                catch
                {
                    // Ignore errors
                }
            }
            // Fallback to legacy path for older versions if needed (optional, but good for transition)
            else
            {
                var legacySandboxPath = $"sandbox/{request.UserId}/{template.Id}.pdf";
                try
                {
                    if (await _storageService.FileExistsAsync(reportBucket, legacySandboxPath))
                    {
                        response.FileSandboxLastTestPresigned = await _storageService.GetPresignedUrlAsync(
                            reportBucket,
                            legacySandboxPath,
                            3600);
                    }
                }
                catch
                {
                    // Ignore errors
                }
            }

            return response;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new DbUpdateException($"Error updating template '{request.TemplateKey}'."), _logger);
        }
    }

    /// <summary>
    /// Walk the payload JSON and convert any presigned MinIO URLs back to immutable
    /// minio: paths before persistence. This ensures URLs can be regenerated (with
    /// fresh signatures) on every GET — so they never appear "expired" to the user.
    /// </summary>
    private string NormalizePayloadUrls(string payloadJson)
    {
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(payloadJson);
            var normalized = NormalizeElement(doc.RootElement);
            return System.Text.Json.JsonSerializer.Serialize(normalized,
                new System.Text.Json.JsonSerializerOptions { WriteIndented = false });
        }
        catch
        {
            return payloadJson; // If anything fails, persist the original payload as-is
        }
    }

    private object? NormalizeElement(System.Text.Json.JsonElement el)
    {
        switch (el.ValueKind)
        {
            case System.Text.Json.JsonValueKind.Object:
                var dict = new Dictionary<string, object?>();
                foreach (var p in el.EnumerateObject())
                    dict[p.Name] = NormalizeElement(p.Value);
                return dict;
            case System.Text.Json.JsonValueKind.Array:
                var list = new List<object?>();
                foreach (var item in el.EnumerateArray())
                    list.Add(NormalizeElement(item));
                return list;
            case System.Text.Json.JsonValueKind.String:
                var s = el.GetString();
                if (!string.IsNullOrEmpty(s))
                {
                    var minioPath = _storageService.TryConvertToMinioPath(s);
                    if (minioPath != null) return minioPath;
                }
                return s;
            case System.Text.Json.JsonValueKind.Number:
                return el.TryGetInt64(out var l) ? l : el.GetDouble();
            case System.Text.Json.JsonValueKind.True: return true;
            case System.Text.Json.JsonValueKind.False: return false;
            case System.Text.Json.JsonValueKind.Null: return null;
            default: return el.GetRawText();
        }
    }
}
