using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Projects.Models;

namespace QorstackReportService.Application.Projects.Queries.GetLogSettings;

public record GetLogSettingsQuery(Guid ProjectId) : IRequest<LogSettingsDto?>;

public class GetLogSettingsQueryHandler : IRequestHandler<GetLogSettingsQuery, LogSettingsDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public GetLogSettingsQueryHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<LogSettingsDto?> Handle(GetLogSettingsQuery request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null) return null;
        var userId = Guid.Parse(userIdStr);

        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == request.ProjectId && p.UserId == userId, cancellationToken);

        if (project == null) return null;

        return new LogSettingsDto
        {
            LogEnabled = project.LogEnabled,
            LogRetentionDays = project.LogRetentionDays
        };
    }
}
