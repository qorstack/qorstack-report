using MediatR;
using QorstackReportService.Application.Templates.Models;

namespace QorstackReportService.Application.Templates.Commands.UpdateTemplate;

/// <summary>
/// Command to update template metadata
/// </summary>
public class UpdateTemplateCommand : IRequest<TemplateDetailResponse>
{
    /// <summary>
    /// Template key
    /// </summary>
    public required string TemplateKey { get; set; }

    /// <summary>
    /// User ID (from authenticated API key)
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Updated template name
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Updated status (active/inactive)
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// Updated sandbox payload for testing
    /// </summary>
    public string? SandboxPayload { get; set; }

    /// <summary>
    /// Template file (.docx) for update
    /// </summary>
    public IFormFile? File { get; set; }

    /// <summary>
    /// Project ID
    /// </summary>
    public Guid? ProjectId { get; set; }

    /// <summary>
    /// Whether to automatically generate variables from the document
    /// </summary>
    public bool IsAutoGenerateVariables { get; set; } = true;


}
