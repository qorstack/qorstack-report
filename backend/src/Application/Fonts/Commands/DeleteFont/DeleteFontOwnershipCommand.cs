using MediatR;

namespace QorstackReportService.Application.Fonts.Commands.DeleteFont;

public class DeleteFontOwnershipCommand : IRequest
{
    public required Guid FontId { get; set; }
    public required Guid ProjectId { get; set; }
    public required Guid UserId { get; set; }
}
