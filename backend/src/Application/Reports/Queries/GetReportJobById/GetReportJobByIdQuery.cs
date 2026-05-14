using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Reports.Queries.GetReportJobById;

/// <summary>
/// Query to get a report job by ID
/// </summary>
public class GetReportJobByIdQuery : IRequest<ReportJobDto>
{
    /// <summary>
    /// Report job ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// User ID (from authenticated API key)
    /// </summary>
    public Guid UserId { get; set; }
}
