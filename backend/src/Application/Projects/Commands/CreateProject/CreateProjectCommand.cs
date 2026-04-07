using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Projects.Commands.CreateProject;

public record CreateProjectCommand(string Name, string? Description) : IRequest<Guid>;

public class CreateProjectCommandHandler : IRequestHandler<CreateProjectCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser; // Need IUser service to get current user ID

    public CreateProjectCommandHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Guid> Handle(CreateProjectCommand request, CancellationToken cancellationToken)
    {
        // Assume user is authenticated and ID is available
        var userIdStr = _currentUser.Id;
        if (userIdStr == null) throw new UnauthorizedAccessException();

        var userId = Guid.Parse(userIdStr);

        var entity = new Project
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = request.Name,
            Description = request.Description,
            Status = "active",
            CreatedDatetime = DateTime.UtcNow
        };

        _context.Projects.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}
