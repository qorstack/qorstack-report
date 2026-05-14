using MediatR;
using QorstackReportService.Application.Fonts.Models;

namespace QorstackReportService.Application.Fonts.Queries.GetFonts;

public class GetFontsQuery : IRequest<List<FontSummaryDto>>
{
    public string? Search { get; set; }
}
