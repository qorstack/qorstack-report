using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Projects.Commands.DeleteProject;

public record DeleteProjectCommand(Guid Id) : IRequest<Unit>;

public class DeleteProjectCommandHandler : IRequestHandler<DeleteProjectCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public DeleteProjectCommandHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(DeleteProjectCommand request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null) throw new UnauthorizedAccessException();
        var userId = Guid.Parse(userIdStr);

        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.UserId == userId, cancellationToken);

        if (project == null) throw new KeyNotFoundException();

        // Soft delete
        project.Status = "archived";
        project.UpdatedDatetime = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
