using QorstackReportService.Application.Templates.Models;

namespace QorstackReportService.Application.Templates.Queries.GetTemplateById;

/// <summary>
/// Query to get a template by ID
/// </summary>
public class GetTemplateByIdQuery : IRequest<TemplateDetailResponse?>
{
    /// <summary>
    /// Template key
    /// </summary>
    public required string TemplateKey { get; set; }

    /// <summary>
    /// User ID (from authenticated API key)
    /// </summary>
    public Guid UserId { get; set; }
}
