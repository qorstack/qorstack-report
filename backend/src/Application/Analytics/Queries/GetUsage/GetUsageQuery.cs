using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Analytics.Models;

namespace QorstackReportService.Application.Analytics.Queries.GetUsage;

public record GetUsageQuery(
    string Range = "7D",
    string GroupBy = "day",
    Guid? ProjectId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null) : IRequest<UsageDataDto>;

public class GetUsageQueryHandler : IRequestHandler<GetUsageQuery, UsageDataDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public GetUsageQueryHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<UsageDataDto> Handle(GetUsageQuery request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        var range = request.Range ?? "7D";
        var groupBy = request.GroupBy ?? "day";

        if (userIdStr == null)
            return new UsageDataDto(range, groupBy, 0, new List<UsageDataPointDto>());

        var userId = Guid.Parse(userIdStr);

        // Resolve date range as DateOnly
        DateOnly fromDate, toDate;
        if (request.FromDate.HasValue && request.ToDate.HasValue)
        {
            fromDate = DateOnly.FromDateTime(request.FromDate.Value);
            toDate = DateOnly.FromDateTime(request.ToDate.Value);
        }
        else
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            toDate = today;
            fromDate = range.ToUpperInvariant() switch
            {
                "24H" => today.AddDays(-1),
                "7D" => today.AddDays(-7),
                "30D" => today.AddDays(-30),
                "THISMONTH" => new DateOnly(today.Year, today.Month, 1),
                _ => today.AddDays(-7)
            };
        }

        // Special handling for hourly grouping - query raw ReportJobs for project breakdown
        if (groupBy.Equals("hour", StringComparison.OrdinalIgnoreCase))
        {
            var fromDateTime = fromDate.ToDateTime(TimeOnly.MinValue);
            var toDateTime = toDate.ToDateTime(TimeOnly.MaxValue);

            var jobsQuery = _context.ReportJobs
                .Include(j => j.TemplateVersion)
                    .ThenInclude(v => v!.Template)
                        .ThenInclude(t => t!.Project)
                .Where(j => j.UserId == userId &&
                            j.CreatedDatetime >= fromDateTime &&
                            j.CreatedDatetime <= toDateTime);

            if (request.ProjectId.HasValue)
            {
                jobsQuery = jobsQuery.Where(j =>
                    j.TemplateVersion != null &&
                    j.TemplateVersion.Template != null &&
                    j.TemplateVersion.Template.ProjectId == request.ProjectId.Value);
            }

            var jobs = await jobsQuery.ToListAsync(cancellationToken);

            // Create a lookup for existing data
            var hourlyLookup = jobs
                .GroupBy(j =>
                {
                    var dt = j.CreatedDatetime!.Value; // UTC
                    return new DateTime(dt.Year, dt.Month, dt.Day, dt.Hour, 0, 0, DateTimeKind.Utc);
                })
                .ToDictionary(g => g.Key, g => g.ToList());

            // Determine start and end hours
            // Use the actual request range if possible, otherwise default to found data or 24h
            var startHour = fromDateTime;
            var endHour = toDateTime;

            // Generate all hours in range
            var hourlyDataPoints = new List<UsageDataPointDto>();
            for (var dt = startHour; dt <= endHour; dt = dt.AddHours(1))
            {
                // Truncate to hour just to be safe
                var hourKey = new DateTime(dt.Year, dt.Month, dt.Day, dt.Hour, 0, 0, DateTimeKind.Utc);

                if (hourlyLookup.TryGetValue(hourKey, out var hourJobs))
                {
                    var breakdown = hourJobs
                        .GroupBy(j => j.TemplateVersion?.Template?.Project?.Name ?? "Unknown")
                        .ToDictionary(pg => pg.Key, pg => pg.Count());

                    hourlyDataPoints.Add(new UsageDataPointDto(
                        hourKey.ToString("yyyy-MM-dd HH:mm"),
                        hourJobs.Count,
                        breakdown));
                }
                else
                {
                    // Add zero-filled entry
                    hourlyDataPoints.Add(new UsageDataPointDto(
                        hourKey.ToString("yyyy-MM-dd HH:mm"),
                        0,
                        new Dictionary<string, int>()));
                }
            }

            var totalHourlyVolume = hourlyDataPoints.Sum(p => p.Count);
            return new UsageDataDto(range, groupBy, totalHourlyVolume, hourlyDataPoints);
        }

        // Read from pre-computed analytics_daily_stats
        var query = _context.AnalyticsDailyStats
            .Where(d => d.UserId == userId && d.StatDate >= fromDate && d.StatDate <= toDate);

        // Filter by project
        if (request.ProjectId.HasValue)
        {
            query = query.Where(d => d.ProjectId == request.ProjectId.Value);
        }

        var stats = await query.ToListAsync(cancellationToken);

        // Resolve project names for breakdown
        var projectIds = stats.Where(s => s.ProjectId.HasValue).Select(s => s.ProjectId!.Value).Distinct().ToList();
        var projectNames = await _context.Projects
            .Where(p => projectIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, cancellationToken);

        var totalVolume = stats.Sum(s => s.TotalCount);

        // Group stats by the specified granularity for quick lookup
        var statsLookup = stats
            .GroupBy(s =>
            {
                if (groupBy.Equals("month", StringComparison.OrdinalIgnoreCase))
                {
                    // Group by first day of month
                    return new DateOnly(s.StatDate.Year, s.StatDate.Month, 1);
                }

                if (groupBy.Equals("week", StringComparison.OrdinalIgnoreCase))
                {
                    // Group by first day of week (Sunday)
                    var diff = (7 + (s.StatDate.DayOfWeek - DayOfWeek.Sunday)) % 7;
                    return s.StatDate.AddDays(-1 * diff);
                }

                // Default: Group by day
                return s.StatDate;
            })
            .ToDictionary(g => g.Key, g => g.ToList());

        // Generate full date range
        var dataPoints = new List<UsageDataPointDto>();
        var current = fromDate;

        // Adjust start date for week/month grouping to ensure we start at the beginning of the period
        if (groupBy.Equals("month", StringComparison.OrdinalIgnoreCase))
        {
            current = new DateOnly(current.Year, current.Month, 1);
        }
        else if (groupBy.Equals("week", StringComparison.OrdinalIgnoreCase))
        {
             var diff = (7 + (current.DayOfWeek - DayOfWeek.Sunday)) % 7;
             current = current.AddDays(-1 * diff);
        }

        while (current <= toDate)
        {
            DateOnly periodKey = current;
            DateOnly nextPeriod;

            if (groupBy.Equals("month", StringComparison.OrdinalIgnoreCase))
            {
                nextPeriod = current.AddMonths(1);
            }
            else if (groupBy.Equals("week", StringComparison.OrdinalIgnoreCase))
            {
                nextPeriod = current.AddDays(7);
            }
            else
            {
                nextPeriod = current.AddDays(1);
            }

            if (statsLookup.TryGetValue(periodKey, out var periodStats))
            {
                var breakdown = periodStats
                    .Where(s => s.ProjectId.HasValue)
                    .GroupBy(s => s.ProjectId!.Value)
                    .ToDictionary(
                        pg => projectNames.GetValueOrDefault(pg.Key, "Unknown"),
                        pg => pg.Sum(s => s.TotalCount));

                dataPoints.Add(new UsageDataPointDto(
                    periodKey.ToString("yyyy-MM-dd"),
                    periodStats.Sum(s => s.TotalCount),
                    breakdown));
            }
            else
            {
                 // Zero-filled entry
                 dataPoints.Add(new UsageDataPointDto(
                    periodKey.ToString("yyyy-MM-dd"),
                    0,
                    new Dictionary<string, int>()));
            }

            // Advance loop
            current = nextPeriod;
        }

        return new UsageDataDto(range, groupBy, totalVolume, dataPoints);
    }
}
