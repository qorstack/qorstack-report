using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Helpers;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Templates.Commands.RegeneratePreview;

/// <summary>
/// Re-renders the preview PDF of a template's current version with the fonts the renderer has now.
/// Needed after fonts are uploaded or imported: previews made before the renderer had a font show a substitute.
/// </summary>
public record RegenerateTemplatePreviewCommand : IRequest<RegenerateTemplatePreviewResult>
{
    public string TemplateKey { get; init; } = string.Empty;
    public Guid UserId { get; init; }
}

public record RegenerateTemplatePreviewResult(string TemplateKey, int Version, string? PreviewFilePathPresigned);

public class RegenerateTemplatePreviewCommandHandler : IRequestHandler<RegenerateTemplatePreviewCommand, RegenerateTemplatePreviewResult>
{
    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storage;
    private readonly IDocxProcessingService _docx;
    private readonly IGotenbergService _gotenberg;
    private readonly IUser _user;
    private readonly ILogger<RegenerateTemplatePreviewCommandHandler> _logger;

    public RegenerateTemplatePreviewCommandHandler(
        IApplicationDbContext context,
        IMinioStorageService storage,
        IDocxProcessingService docx,
        IGotenbergService gotenberg,
        IUser user,
        ILogger<RegenerateTemplatePreviewCommandHandler> logger)
    {
        _context = context;
        _storage = storage;
        _docx = docx;
        _gotenberg = gotenberg;
        _user = user;
        _logger = logger;
    }

    public async Task<RegenerateTemplatePreviewResult> Handle(RegenerateTemplatePreviewCommand request, CancellationToken cancellationToken)
    {
        var template = await _context.Templates
            .Include(t => t.TemplateVersions)
            .FirstOrDefaultAsync(t => t.TemplateKey == request.TemplateKey && t.UserId == request.UserId, cancellationToken)
            ?? throw new KeyNotFoundException($"Template with key {request.TemplateKey} not found.");

        var version = template.TemplateVersions.FirstOrDefault(v => v.Status == "active")
                      ?? template.TemplateVersions.OrderByDescending(v => v.Version).FirstOrDefault()
                      ?? throw new KeyNotFoundException($"Template {request.TemplateKey} has no file yet.");

        var isExcel = version.FilePath.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase);

        using var file = new MemoryStream();
        await using (var source = await _storage.DownloadFileAsync(StorageAreas.Templates, version.FilePath))
            await source.CopyToAsync(file, cancellationToken);
        file.Position = 0;

        // Same rendering as a fresh upload (UploadTemplateCommandHandler): Excel with gridlines, Word preprocessed.
        byte[] pdf;
        if (isExcel)
        {
            using var withGridlines = ExcelGridlineHelper.AddGridlineBorders(file);
            pdf = await _gotenberg.ConvertDocxToPdfAsync(withGridlines, cancellationToken);
        }
        else
        {
            using var processed = await _docx.PreprocessForPreviewAsync(file, cancellationToken);
            pdf = await _gotenberg.ConvertDocxToPdfAsync(processed, cancellationToken);
        }

        var objectName = string.IsNullOrEmpty(version.PreviewFilePath)
            ? $"{template.UserId}/{template.Id}/v{version.Version}_preview.pdf"
            : version.PreviewFilePath;
        using (var pdfStream = new MemoryStream(pdf))
            await _storage.UploadFileAsync(StorageAreas.Templates, objectName, pdfStream, "application/pdf");

        version.PreviewFilePath = objectName;
        version.UpdatedBy = _user.Id;
        version.UpdatedDatetime = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Preview regenerated for template {TemplateKey} v{Version}", template.TemplateKey, version.Version);
        var url = await _storage.GetPresignedUrlAsync(StorageAreas.Templates, objectName, 3600);
        return new RegenerateTemplatePreviewResult(template.TemplateKey, version.Version, url);
    }
}
