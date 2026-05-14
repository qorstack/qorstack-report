using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Templates.Models;

namespace QorstackReportService.Application.Templates.Queries.GetTemplatesWithPagination;

/// <summary>
/// Query to get templates with pagination
/// </summary>
public class GetTemplatesWithPaginationQuery : IRequest<PaginatedList<TemplateResponse>>
{
    /// <summary>
    /// User ID (from authenticated API key)
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Filter by status (optional)
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// Search by name (optional)
    /// </summary>
    public string? SearchName { get; set; }

    /// <summary>
    /// Filter by project ID (optional)
    /// </summary>
    public Guid? ProjectId { get; set; }

    /// <summary>
    /// Page number (1-based)
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// Page size
    /// </summary>
    public int PageSize { get; set; } = 10;
}
