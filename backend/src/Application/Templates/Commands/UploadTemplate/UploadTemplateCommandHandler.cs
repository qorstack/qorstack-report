using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Helpers;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Templates.Models;
using QorstackReportService.Domain.Entities;
using QorstackReportService.Domain.Enums;

namespace QorstackReportService.Application.Templates.Commands.UploadTemplate;

/// <summary>
/// Handler for UploadTemplateCommand
/// </summary>
public class UploadTemplateCommandHandler : IRequestHandler<UploadTemplateCommand, TemplateDetailResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storageService;
    private readonly IDocxProcessingService _docxService;
    private readonly IExcelProcessingService _excelService;
    private readonly IUser _user;
    private readonly ILogger<UploadTemplateCommandHandler> _logger;
    private readonly string _templateBucket;
    private readonly IGotenbergService _gotenbergService;
    private readonly ITemplateKeyGenerator _keyGenerator;

    public UploadTemplateCommandHandler(
        IApplicationDbContext context,
        IMinioStorageService storageService,
        IDocxProcessingService docxService,
        IExcelProcessingService excelService,
        IUser user,
        ILogger<UploadTemplateCommandHandler> logger,
        IConfiguration configuration,
        IGotenbergService gotenbergService,
        ITemplateKeyGenerator keyGenerator)
    {
        _context = context;
        _storageService = storageService;
        _docxService = docxService;
        _excelService = excelService;
        _user = user;
        _logger = logger;
        _templateBucket = configuration["Minio:TemplateBucket"] ?? "templates";
        _gotenbergService = gotenbergService;
        _keyGenerator = keyGenerator;
    }

    public async Task<TemplateDetailResponse> Handle(UploadTemplateCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Uploading template '{Name}' for user {UserId}",
            request.Name, request.UserId);

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Detect file type from extension
            var fileName = request.File.FileName;
            var fileExtension = Path.GetExtension(fileName)?.ToLowerInvariant() ?? ".docx";
            var isExcel = fileExtension is ".xlsx" or ".xls";

            // Validate the template file
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

            // Determine template key
            string templateKey;
            if (!string.IsNullOrWhiteSpace(request.TemplateKey))
            {
                templateKey = request.TemplateKey;
            }
            else
            {
                templateKey = await _keyGenerator.GenerateUniqueTemplateKeyAsync(request.UserId, cancellationToken);
            }

            // Check if template with this key already exists for this user
            var existingTemplate = await _context.Templates
                .Include(t => t.TemplateVersions)
                .FirstOrDefaultAsync(t => t.UserId == request.UserId && t.TemplateKey == templateKey, cancellationToken);

            Guid templateId;
            int newVersion;
            string? finalSandboxPayload = null;

            if (existingTemplate != null)
            {
                // Update existing template - create new version
                templateId = existingTemplate.Id;

                // Set all existing versions to inactive
                foreach (var version in existingTemplate.TemplateVersions)
                {
                    version.Status = "inactive";
                    version.UpdatedBy = _user.Id;
                    version.UpdatedDatetime = DateTime.UtcNow;
                }

                newVersion = existingTemplate.TemplateVersions.Max(v => v.Version) + 1;

                _logger.LogInformation("Updating existing template {TemplateId} with new version {Version}",
                    templateId, newVersion);

                // Get payload from latest version for base
                var latestVersionPayload = existingTemplate.TemplateVersions
                    .OrderByDescending(v => v.Version)
                    .Select(v => v.SandboxPayload)
                    .FirstOrDefault(); // This can be null if no versions exist, but we expect at least one.

                // Start with request payload if provided, otherwise use the latest version's payload
                string? initialPayload = request.SandboxPayload ?? latestVersionPayload;
                finalSandboxPayload = initialPayload;

                // Update Sandbox Payload based on new template content
                if (request.IsAutoGenerateVariables)
                {
                    // If user provided a payload, preserve its order. If generated from scratch/latest, enforce document order.
                    // หาก User ส่ง Payload มา ให้รักษาลำดับเดิม (PreserveOrder)
                    bool preserveOrder = !string.IsNullOrEmpty(request.SandboxPayload);

                    finalSandboxPayload = PayloadHelper.SyncPayloadWithMarkers(
                        initialPayload,
                        markers,
                        deleteUnused: true, // Only delete unused if we are generating from scratch
                        preserveOrder: preserveOrder);
                }

                existingTemplate.UpdatedBy = _user.Id;
                existingTemplate.UpdatedDatetime = DateTime.UtcNow;
            }
            else
            {
                // Create new template
                templateId = Guid.NewGuid();
                newVersion = 1;

                // Prepare Sandbox Payload for a new template
                // Start with request payload if provided
                finalSandboxPayload = request.SandboxPayload;

                if (request.IsAutoGenerateVariables)
                {
                    // If auto-generate is true, sync with markers.
                    // If request.SandboxPayload was null, it will start with null and generate from markers.
                    // If request.SandboxPayload was provided, it will sync that with markers.
                    finalSandboxPayload = PayloadHelper.SyncPayloadWithMarkers(
                        finalSandboxPayload, // Start with request payload (or null)
                        markers,
                        true); // Always delete unused variables for a new template
                }

                var template = new Template
                {
                    Id = templateId,
                    UserId = request.UserId,
                    ProjectId = request.ProjectId,
                    TemplateKey = templateKey,
                    Name = request.Name,
                    // SandboxPayload on Template is deprecated but we keep it null or for legacy support if needed
                    // But requirement says move to TemplateVersion. So we can leave it null or copy it.
                    // Let's keep it null in Template entity to avoid confusion, or set it for backward compatibility if other reads use it?
                    // The plan is to move to TemplateVersion. Let's start clean.
                    // SandboxPayload = null, // Removed from entity
                    CreatedBy = _user.Id,
                    CreatedDatetime = DateTime.UtcNow
                };

                _context.Templates.Add(template);
                _logger.LogDebug("Created new template record: {TemplateId}", templateId);
            }

            // Create new version
            var versionId = Guid.NewGuid();
            var objectName = $"{request.UserId}/{templateId}/v{newVersion}{fileExtension}";

            var templateVersion = new TemplateVersion
            {
                Id = versionId,
                TemplateId = templateId,
                Version = newVersion,
                FilePath = objectName,
                SandboxPayload = finalSandboxPayload,
                Status = "active",
                CreatedBy = _user.Id,
                CreatedDatetime = DateTime.UtcNow
            };

            _context.TemplateVersions.Add(templateVersion);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogDebug("Template version saved to database: {VersionId}", versionId);

            // Upload file to MinIO
            var contentType = isExcel
                ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            await _storageService.UploadFileAsync(
                _templateBucket,
                objectName,
                fileStream,
                contentType);

            _logger.LogDebug("File uploaded to MinIO successfully: {ObjectName}", objectName);

            // Generate preview PDF
                string? previewFilePath = null;
                try
                {
                    fileStream.Position = 0;

                    byte[] pdfBytes;
                    if (isExcel)
                    {
                        // For Excel, convert directly to PDF via Gotenberg (no preprocessing needed)
                        pdfBytes = await _gotenbergService.ConvertDocxToPdfAsync(fileStream, cancellationToken);
                    }
                    else
                    {
                        // For DOCX, preprocess (flatten SDTs, keep original fonts) then convert
                        using var processedDocx = await _docxService.PreprocessForPreviewAsync(fileStream, cancellationToken);
                        pdfBytes = await _gotenbergService.ConvertDocxToPdfAsync(processedDocx, cancellationToken);
                    }

                var previewObjectName = $"{request.UserId}/{templateId}/v{newVersion}_preview.pdf";
                using var pdfStream = new MemoryStream(pdfBytes);

                await _storageService.UploadFileAsync(
                    _templateBucket,
                    previewObjectName,
                    pdfStream,
                    "application/pdf");

                previewFilePath = previewObjectName;
                _logger.LogDebug("Preview PDF uploaded to MinIO: {PreviewPath}", previewObjectName);

                // Update template version with preview path
                templateVersion.PreviewFilePath = previewFilePath;
                templateVersion.UpdatedBy = _user.Id;
                templateVersion.UpdatedDatetime = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                // Log but don't fail the upload if preview generation fails
                _logger.LogWarning(ex, "Failed to generate preview PDF for template {TemplateId}", templateId);
            }

            // Commit transaction
            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("Successfully uploaded template {TemplateId} version {Version} for user {UserId}",
                templateId, newVersion, request.UserId);

            return new TemplateDetailResponse
            {
                Id = templateId,
                UserId = request.UserId,
                ProjectId = request.ProjectId,
                TemplateKey = templateKey,
                Name = request.Name,
                SandboxPayload = finalSandboxPayload,
                ActiveVersion = new TemplateVersionResponse
                {
                    Id = versionId,
                    TemplateId = templateId,
                    Version = newVersion,
                    FilePath = objectName,
                    PreviewFilePath = previewFilePath,
                    PreviewFilePathPresigned = !string.IsNullOrEmpty(previewFilePath)
                        ? await _storageService.GetPresignedUrlAsync(_templateBucket, previewFilePath, 3600)
                        : null,
                    Status = "active",
                    CreatedBy = _user.Id,
                    CreatedDatetime = DateTime.UtcNow
                },
                AllVersions = new List<TemplateVersionResponse>
                {
                    new TemplateVersionResponse
                    {
                        Id = versionId,
                        TemplateId = templateId,
                        Version = newVersion,
                        FilePath = objectName,
                        PreviewFilePath = previewFilePath,
                        PreviewFilePathPresigned = !string.IsNullOrEmpty(previewFilePath)
                            ? await _storageService.GetPresignedUrlAsync(_templateBucket, previewFilePath, 3600)
                            : null,
                        Status = "active",
                        CreatedBy = _user.Id,
                        CreatedDatetime = DateTime.UtcNow
                    }
                },
                CreatedBy = _user.Id,
                CreatedDatetime = DateTime.UtcNow,
                UpdatedBy = _user.Id,
                UpdatedDatetime = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new DbUpdateException($"Error uploading for '{request.Name}'."), _logger);
        }
    }


}
