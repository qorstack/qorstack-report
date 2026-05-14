using MediatR;
using Microsoft.AspNetCore.Http;
using QorstackReportService.Application.Templates.Models;

namespace QorstackReportService.Application.Templates.Commands.UploadTemplate;

/// <summary>
/// Command to upload a new template
/// </summary>
public class UploadTemplateCommand : IRequest<TemplateDetailResponse>
{
    /// <summary>
    /// User ID (from authenticated API key)
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Template name
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// The template file (.docx)
    /// </summary>
    public required IFormFile File { get; set; }

    /// <summary>
    /// Optional custom template key
    /// </summary>
    public string? TemplateKey { get; set; }

    /// <summary>
    /// Project ID
    /// </summary>
    public Guid? ProjectId { get; set; }

    /// <summary>
    /// Whether to automatically generate variables from the document
    /// </summary>
    public bool IsAutoGenerateVariables { get; set; } = true;


    /// <summary>
    /// Optional initial sandbox payload
    /// </summary>
    public string? SandboxPayload { get; set; }
}
