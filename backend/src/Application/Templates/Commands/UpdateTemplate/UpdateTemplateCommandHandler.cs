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
    private readonly IGotenbergService _gotenbergService;

    private readonly string _templateBucket;
    private readonly IConfiguration _configuration;

    public UpdateTemplateCommandHandler(
        IApplicationDbContext context,
        IUser user,
        ILogger<UpdateTemplateCommandHandler> logger,
        IMinioStorageService storageService,
        IDocxProcessingService docxService,
        IGotenbergService gotenbergService,
        IConfiguration configuration)
    {
        _context = context;
        _user = user;
        _logger = logger;
        _storageService = storageService;
        _docxService = docxService;
        _gotenbergService = gotenbergService;
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
                template.ProjectId = request.ProjectId;
            }

            // Update SandboxPayload on Active Version if provided and no new file (if new file, we handle it below)
            if (request.SandboxPayload != null && request.File == null && activeVersion != null)
            {
                activeVersion.SandboxPayload = request.SandboxPayload;
                activeVersion.UpdatedBy = _user.Id;
                activeVersion.UpdatedDatetime = DateTime.UtcNow;
            }

            if (request.File != null)
            {
                _logger.LogInformation("Updating template {TemplateKey} with new file upload", request.TemplateKey);

                // Validate the template file
                using var fileStream = request.File.OpenReadStream();
                var validationResult = await _docxService.ValidateTemplateAsync(fileStream);

                if (!validationResult.IsValid)
                {
                    var errors = string.Join("; ", validationResult.Errors);
                    _logger.LogWarning("Template validation failed: {Errors}", errors);
                    throw new ValidationException($"Invalid template: {errors}");
                }

                // Reset stream position for upload
                fileStream.Position = 0;

                // Extract markers and update payload
                var markers = await _docxService.ExtractMarkersAsync(fileStream);
                fileStream.Position = 0;

                // Prepare Sandbox Payload for new version
                string? newPayload = null;

                // Use request payload if provided, otherwise use current active version payload.
                // Fallback to null if no active version (shouldn't happen for existing template with file).
                var currentPayload = request.SandboxPayload ?? activeVersion?.SandboxPayload;

                // Update Sandbox Payload based on new template content
                if (request.IsAutoGenerateVariables)
                {
                    // If we have an existing payload (from Request or DB), preserve its order and keys.
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
                var objectName = $"{request.UserId}/{template.Id}/v{newVersion}.docx";

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

                // Task 1: Upload Original File
                var uploadTask = _storageService.UploadFileAsync(
                    _templateBucket,
                    objectName,
                    fileStream,
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

                // Task 2: Generate and Upload Preview
                var previewTask = Task.Run(async () =>
                {
                    // Preprocess for preview: only flatten SDTs, keep original fonts
                    using var processedDocx = await _docxService.PreprocessForPreviewAsync(previewStream, cancellationToken);

                    var pdfBytes = await _gotenbergService.ConvertDocxToPdfAsync(processedDocx, cancellationToken);

                    // Upload PDF
                    var pdfObjectName = $"{request.UserId}/{template.Id}/v{newVersion}_preview.pdf";

                    using var pdfStream = new MemoryStream(pdfBytes);
                    await _storageService.UploadFileAsync(
                        _templateBucket,
                        pdfObjectName,
                        pdfStream,
                        "application/pdf");

                    // Set PreviewFilePath on TemplateVersion (thread-safe enough since it's a specific instance property)
                    templateVersion.PreviewFilePath = pdfObjectName;

                    _logger.LogInformation("Generated and uploaded PDF preview: {PdfObjectName}", pdfObjectName);
                }, cancellationToken);

                await Task.WhenAll(uploadTask, previewTask);

                _logger.LogDebug("File uploaded to MinIO successfully: {ObjectName}", objectName);
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
}
