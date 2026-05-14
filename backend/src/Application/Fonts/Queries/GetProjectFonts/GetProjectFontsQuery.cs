using MediatR;
using QorstackReportService.Application.Fonts.Models;

namespace QorstackReportService.Application.Fonts.Queries.GetProjectFonts;

public class GetProjectFontsQuery : IRequest<List<FontSummaryDto>>
{
    public required Guid ProjectId { get; set; }
    public required Guid UserId { get; set; }
    public string? Search { get; set; }
}
