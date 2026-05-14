using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Projects.Models;

namespace QorstackReportService.Application.Projects.Queries.GetProjects;

public record GetProjectsQuery : IRequest<List<ProjectDto>>;

public class GetProjectsQueryHandler : IRequestHandler<GetProjectsQuery, List<ProjectDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public GetProjectsQueryHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<List<ProjectDto>> Handle(GetProjectsQuery request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null) return new List<ProjectDto>();
        var userId = Guid.Parse(userIdStr);

        return await _context.Projects
            .Where(p => p.UserId == userId && p.Status != "archived")
            .OrderByDescending(p => p.CreatedDatetime)
            .Select(p => new ProjectDto(p.Id, p.Name, p.Description, p.Status, p.CreatedDatetime))
            .ToListAsync(cancellationToken);
    }
}
