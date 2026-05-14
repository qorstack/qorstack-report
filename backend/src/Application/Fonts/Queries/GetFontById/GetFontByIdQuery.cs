using MediatR;
using QorstackReportService.Application.Fonts.Models;

namespace QorstackReportService.Application.Fonts.Queries.GetFontById;

public class GetFontByIdQuery : IRequest<FontDetailDto?>
{
    public required Guid FontId { get; set; }
}
