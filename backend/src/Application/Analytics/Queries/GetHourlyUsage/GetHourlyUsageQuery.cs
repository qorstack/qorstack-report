using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Analytics.Models;

namespace QorstackReportService.Application.Analytics.Queries.GetHourlyUsage;

public record GetHourlyUsageQuery(string? Date = null) : IRequest<List<HourlyUsageDto>>;

public class GetHourlyUsageQueryHandler : IRequestHandler<GetHourlyUsageQuery, List<HourlyUsageDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public GetHourlyUsageQueryHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<List<HourlyUsageDto>> Handle(GetHourlyUsageQuery request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null)
            return Enumerable.Range(0, 24).Select(h => new HourlyUsageDto(h, 0)).ToList();

        var userId = Guid.Parse(userIdStr);

        // Parse target date as DateOnly
        DateOnly targetDate;
        if (!string.IsNullOrEmpty(request.Date) && DateOnly.TryParse(request.Date, out var parsed))
            targetDate = parsed;
        else
            targetDate = DateOnly.FromDateTime(DateTime.UtcNow);

        // Read from pre-computed analytics_hourly_stats
        var hourlyStats = await _context.AnalyticsHourlyStats
            .Where(h => h.UserId == userId && h.StatDate == targetDate)
            .ToListAsync(cancellationToken);

        var hourlyLookup = hourlyStats.ToDictionary(h => (int)h.StatHour, h => h.TotalCount);

        // Return all 24 hours, filling missing with 0
        return Enumerable.Range(0, 24)
            .Select(h => new HourlyUsageDto(h, hourlyLookup.GetValueOrDefault(h, 0)))
            .ToList();
    }
}
