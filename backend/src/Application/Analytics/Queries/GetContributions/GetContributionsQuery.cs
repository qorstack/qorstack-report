using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Analytics.Models;

namespace QorstackReportService.Application.Analytics.Queries.GetContributions;

public record GetContributionsQuery(int? Year = null) : IRequest<ContributionDataDto>;

public class GetContributionsQueryHandler : IRequestHandler<GetContributionsQuery, ContributionDataDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public GetContributionsQueryHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<ContributionDataDto> Handle(GetContributionsQuery request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null)
            return new ContributionDataDto(0, 0, new BusiestDayDto("", 0), 0, new List<DailyContributionDto>());

        var userId = Guid.Parse(userIdStr);
        var year = request.Year ?? DateTime.UtcNow.Year;

        var startOfYear = new DateOnly(year, 1, 1);
        var endOfYear = new DateOnly(year, 12, 31);

        // Read from pre-computed analytics_daily_stats — aggregate across all projects per date
        var dailyStats = await _context.AnalyticsDailyStats
            .Where(d => d.UserId == userId && d.StatDate >= startOfYear && d.StatDate <= endOfYear)
            .GroupBy(d => d.StatDate)
            .Select(g => new { Date = g.Key, Count = g.Sum(d => d.TotalCount) })
            .OrderBy(x => x.Date)
            .ToListAsync(cancellationToken);

        var totalContributions = dailyStats.Sum(d => d.Count);
        var activeDays = dailyStats.Count(d => d.Count > 0);

        // Busiest day
        var busiest = dailyStats.OrderByDescending(d => d.Count).FirstOrDefault();
        var busiestDay = busiest != null
            ? new BusiestDayDto(busiest.Date.ToString("yyyy-MM-dd"), busiest.Count)
            : new BusiestDayDto("", 0);

        // Growth percent vs previous year
        var prevYearStart = new DateOnly(year - 1, 1, 1);
        var prevYearEnd = new DateOnly(year - 1, 12, 31);
        var prevYearTotal = await _context.AnalyticsDailyStats
            .Where(d => d.UserId == userId && d.StatDate >= prevYearStart && d.StatDate <= prevYearEnd)
            .SumAsync(d => d.TotalCount, cancellationToken);

        var growthPercent = prevYearTotal > 0
            ? Math.Round(((double)(totalContributions - prevYearTotal) / prevYearTotal) * 100, 1)
            : 0;

        // Build full year daily data (fill missing days with 0)
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var lastDate = year == today.Year ? today : endOfYear;
        var dailyLookup = dailyStats.ToDictionary(d => d.Date, d => d.Count);

        var dailyData = new List<DailyContributionDto>();
        for (var date = startOfYear; date <= lastDate; date = date.AddDays(1))
        {
            dailyLookup.TryGetValue(date, out var count);
            dailyData.Add(new DailyContributionDto(date.ToString("yyyy-MM-dd"), count));
        }

        return new ContributionDataDto(totalContributions, growthPercent, busiestDay, activeDays, dailyData);
    }
}
