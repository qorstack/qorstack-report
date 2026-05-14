using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Templates.Models;

/// <summary>
/// Response model for TemplateVersion with presigned URL for preview
/// Extends TemplateVersionDto to add computed/API-only fields
/// </summary>
public class TemplateVersionResponse : TemplateVersionDto
{
    /// <summary>
    /// Presigned URL for the preview PDF (computed at runtime)
    /// </summary>
    public string? PreviewFilePathPresigned { get; set; }
}
