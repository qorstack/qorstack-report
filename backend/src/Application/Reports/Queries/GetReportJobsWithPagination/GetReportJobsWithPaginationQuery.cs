using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Reports.Queries.GetReportJobsWithPagination;

/// <summary>
/// Query to get report jobs with pagination
/// </summary>
public class GetReportJobsWithPaginationQuery : IRequest<PaginatedList<ReportJobDto>>
{
    /// <summary>
    /// User ID (from authenticated API key)
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Filter by template key (optional)
    /// </summary>
    public string? TemplateKey { get; set; }

    /// <summary>
    /// Filter by status (optional)
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// Filter by start date (optional)
    /// </summary>
    public DateTime? FromDate { get; set; }

    /// <summary>
    /// Filter by end date (optional)
    /// </summary>
    public DateTime? ToDate { get; set; }

    /// <summary>
    /// Page number (1-based)
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// Page size
    /// </summary>
    public int PageSize { get; set; } = 10;
}
