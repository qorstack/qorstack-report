
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Templates.Models;

/// <summary>
/// Response model for Template with active version included
/// Extends TemplateDto to add computed/API-only fields
/// </summary>
public class TemplateResponse : TemplateDto
{
    /// <summary>
    /// The active version of this template (if any)
    /// </summary>
    public TemplateVersionResponse? ActiveVersion { get; set; }



    /// <summary>
    /// All versions of this template
    /// </summary>
    public List<TemplateVersionResponse> AllVersions { get; set; } = new();

    /// <summary>
    /// Check if validation of template structure failed
    /// </summary>
    // public bool IsStructureValid { get; set; } // Example if needed

    /// <summary>
    /// Serialization of the payload for the sandbox
    /// </summary>
    public string? SandboxPayload { get; set; }
}

/// <summary>
/// Detailed response model for Template (used in GetById, Update)
/// </summary>
public class TemplateDetailResponse : TemplateResponse
{
    /// <summary>
    /// Presigned URL for the last sandbox test PDF (if exists)
    /// </summary>
    public string? FileSandboxLastTestPresigned { get; set; }
}
