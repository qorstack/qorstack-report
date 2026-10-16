using MediatR;
using QorstackReportService.Application.Templates.Models;

namespace QorstackReportService.Application.Templates.Commands.ImportGalleryTemplate;

/// <summary>
/// Import a curated gallery template into the user's project as a new template.
/// Reuses the standard upload pipeline, so the imported template behaves exactly
/// like one the user uploaded themselves.
/// </summary>
public class ImportGalleryTemplateCommand : IRequest<TemplateDetailResponse>
{
    /// <summary>User ID (from authenticated principal).</summary>
    public Guid UserId { get; set; }

    /// <summary>Gallery template id (from the manifest).</summary>
    public required string GalleryId { get; set; }

    /// <summary>Target project to import into (optional).</summary>
    public Guid? ProjectId { get; set; }

    /// <summary>Optional name override; defaults to the gallery template's name.</summary>
    public string? Name { get; set; }
}
