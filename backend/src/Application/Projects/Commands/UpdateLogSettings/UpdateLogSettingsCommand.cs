using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Projects.Commands.UpdateLogSettings;

public record UpdateLogSettingsCommand(Guid ProjectId, bool LogEnabled, int LogRetentionDays) : IRequest<bool>;

public class UpdateLogSettingsCommandHandler : IRequestHandler<UpdateLogSettingsCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public UpdateLogSettingsCommandHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<bool> Handle(UpdateLogSettingsCommand request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null) return false;
        var userId = Guid.Parse(userIdStr);

        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == request.ProjectId && p.UserId == userId, cancellationToken);

        if (project == null) return false;

        project.LogEnabled = request.LogEnabled;
        project.LogRetentionDays = request.LogRetentionDays;
        project.UpdatedBy = userIdStr;
        project.UpdatedDatetime = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
