using MediatR;

namespace QorstackReportService.Application.Fonts.Commands.DeleteFont;

public class HardDeleteFontCommand : IRequest
{
    public required Guid FontId { get; set; }
}
