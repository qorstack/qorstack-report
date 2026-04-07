using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Templates.Commands.DeleteTemplate;

/// <summary>
/// Handler for DeleteTemplateCommand
/// </summary>
public class DeleteTemplateCommandHandler : IRequestHandler<DeleteTemplateCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storageService;
    private readonly ILogger<DeleteTemplateCommandHandler> _logger;
    private readonly string _templateBucket;
    private readonly string _reportBucket;

    public DeleteTemplateCommandHandler(
        IApplicationDbContext context,
        IMinioStorageService storageService,
        ILogger<DeleteTemplateCommandHandler> logger,
        IConfiguration configuration)
    {
        _context = context;
        _storageService = storageService;
        _logger = logger;
        _templateBucket = configuration["Minio:TemplateBucket"] ?? "templates";
        _reportBucket = configuration["Minio:ReportBucket"] ?? "reports";
    }

    public async Task<Unit> Handle(DeleteTemplateCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Deleting template {TemplateKey} for user {UserId}",
            request.TemplateKey, request.UserId);

        var template = await _context.Templates
            .Include(t => t.TemplateVersions)
            .FirstOrDefaultAsync(t => t.TemplateKey == request.TemplateKey && t.UserId == request.UserId, cancellationToken);

        if (template == null)
        {
            throw new KeyNotFoundException($"Template with key {request.TemplateKey} not found.");
        }

        // Collect file paths before deleting from DB (entity will be gone after Remove)
        var filesToDelete = template.TemplateVersions.SelectMany(v => new[]
        {
            (Bucket: _templateBucket, Path: v.FilePath, Desc: "template DOCX"),
            (Bucket: _templateBucket, Path: v.PreviewFilePath, Desc: "preview PDF"),
            (Bucket: _reportBucket, Path: v.SandboxFilePath, Desc: "sandbox PDF"),
        }).ToList();

        var sandboxAssetsPrefix = $"sandbox-assets/{request.UserId}/{template.Id}/";

        // 1. Delete from database first (CASCADE deletes TemplateVersions, SET NULL on ReportJobs/Analytics)
        _context.Templates.Remove(template);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Template {TemplateKey} permanently deleted from database", request.TemplateKey);

        // 2. Cleanup storage (best-effort — orphaned files are acceptable, lost DB records are not)
        foreach (var file in filesToDelete)
        {
            await TryDeleteFileAsync(file.Bucket, file.Path, file.Desc);
        }

        try
        {
            await _storageService.DeleteByPrefixAsync(_reportBucket, sandboxAssetsPrefix);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete sandbox assets for template {TemplateId}", template.Id);
        }

        return Unit.Value;
    }

    private async Task TryDeleteFileAsync(string bucket, string? filePath, string description)
    {
        if (string.IsNullOrEmpty(filePath)) return;
        try
        {
            await _storageService.DeleteFileAsync(bucket, filePath);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete {Description} from storage: {FilePath}", description, filePath);
        }
    }
}
