using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Analytics.Models;

namespace QorstackReportService.Application.Analytics.Queries.GetWeeklyUsage;

public record GetWeeklyUsageQuery : IRequest<List<WeeklyUsageDto>>;

public class GetWeeklyUsageQueryHandler : IRequestHandler<GetWeeklyUsageQuery, List<WeeklyUsageDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public GetWeeklyUsageQueryHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<List<WeeklyUsageDto>> Handle(GetWeeklyUsageQuery request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null) return new List<WeeklyUsageDto>();
        var userId = Guid.Parse(userIdStr);

        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);

        var usage = await _context.ReportJobs
            .Where(j => j.UserId == userId && j.CreatedDatetime >= sevenDaysAgo)
            .GroupBy(j => j.CreatedDatetime!.Value.Date)
            .Select(g => new
            {
                Date = g.Key,
                Count = g.Count()
            })
            .OrderBy(x => x.Date)
            .ToListAsync(cancellationToken);

        return usage.Select(u => new WeeklyUsageDto(u.Date.ToString("yyyy-MM-dd"), u.Count)).ToList();
    }
}
