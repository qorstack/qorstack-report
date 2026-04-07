using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Analytics.Models;

namespace QorstackReportService.Application.Analytics.Queries.GetDashboardSummary;

public record GetDashboardSummaryQuery(
    string Range = "7D",
    Guid? ProjectId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null
) : IRequest<DashboardSummaryDto>;

public class GetDashboardSummaryQueryHandler : IRequestHandler<GetDashboardSummaryQuery, DashboardSummaryDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public GetDashboardSummaryQueryHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<DashboardSummaryDto> Handle(GetDashboardSummaryQuery request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null)
            return new DashboardSummaryDto(0, Array.Empty<int>(), 0, 5, 0, Array.Empty<double>(), 0, new List<TemplateBreakdownDto>(), 0, 0);

        var userId = Guid.Parse(userIdStr);
        var (fromDate, toDate) = ResolveRange(request.Range, request.FromDate, request.ToDate);
        var days = toDate.DayNumber - fromDate.DayNumber + 1;

        // Read from pre-computed analytics_daily_stats
        var query = _context.AnalyticsDailyStats
            .Where(d => d.UserId == userId && d.StatDate >= fromDate && d.StatDate <= toDate);

        if (request.ProjectId.HasValue)
        {
            query = query.Where(d => d.ProjectId == request.ProjectId.Value);
        }

        var dailyStats = await query
            .OrderBy(d => d.StatDate)
            .ToListAsync(cancellationToken);

        // Aggregate across all projects
        var totalGenerated = dailyStats.Sum(d => d.TotalCount);
        var totalErrors = dailyStats.Sum(d => d.FailedCount);
        var successRate = totalGenerated > 0 ? Math.Round(((double)(totalGenerated - totalErrors) / totalGenerated) * 100, 1) : 0;

        // Build daily trends
        var totalGeneratedTrend = new int[days];
        var successRateTrend = new double[days];
        for (int i = 0; i < days; i++)
        {
            var date = fromDate.AddDays(i);
            var dayStats = dailyStats.Where(d => d.StatDate == date).ToList();
            var dayTotal = dayStats.Sum(d => d.TotalCount);
            var dayErrors = dayStats.Sum(d => d.FailedCount);
            totalGeneratedTrend[i] = dayTotal;
            successRateTrend[i] = dayTotal > 0
                ? Math.Round(((double)(dayTotal - dayErrors) / dayTotal) * 100, 1)
                : 100.0;
        }

        // Active projects
        var activeProjects = await _context.Projects
            .CountAsync(p => p.UserId == userId, cancellationToken);

        // Total templates with type breakdown
        var templatesQuery = _context.Templates
            .Where(t => t.UserId == userId)
            .Include(t => t.TemplateVersions)
            .AsQueryable();

        if (request.ProjectId.HasValue)
        {
            templatesQuery = templatesQuery.Where(t => t.ProjectId == request.ProjectId.Value);
        }

        var templates = await templatesQuery.ToListAsync(cancellationToken);

        var totalTemplates = templates.Count;
        var pdfCount = 0;
        var excelCount = 0;
        foreach (var t in templates)
        {
            var activeVersion = t.TemplateVersions.FirstOrDefault(v => v.Status == "active");
            var filePath = activeVersion?.FilePath ?? "";
            if (filePath.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) ||
                filePath.EndsWith(".xls", StringComparison.OrdinalIgnoreCase))
                excelCount++;
            else
                pdfCount++;
        }

        var templateBreakdown = new List<TemplateBreakdownDto>
        {
            new("PDF", pdfCount),
            new("Excel", excelCount)
        };

        // Credit balance
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        var creditBalance = user?.CreditBalance ?? 0;

        var maxProjects = 5; // TODO: Get from plan
        var creditLimit = 10000; // TODO: Get from plan

        return new DashboardSummaryDto(
            totalGenerated, totalGeneratedTrend,
            activeProjects, maxProjects,
            successRate, successRateTrend,
            totalTemplates, templateBreakdown,
            creditBalance, creditLimit);
    }

    private static (DateOnly fromDate, DateOnly toDate) ResolveRange(string range, DateTime? customFrom, DateTime? customTo)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        if (customFrom.HasValue || customTo.HasValue)
        {
            var end = customTo.HasValue ? DateOnly.FromDateTime(customTo.Value) : today;
            var start = customFrom.HasValue ? DateOnly.FromDateTime(customFrom.Value) : end.AddDays(-7);
            return (start, end);
        }

        if (string.IsNullOrEmpty(range))
             return (today.AddDays(-7), today);

        // Handle yyyy-MM format (e.g. 2026-02)
        if (System.Text.RegularExpressions.Regex.IsMatch(range, @"^\d{4}-\d{2}$"))
        {
            if (DateOnly.TryParseExact(range + "-01", "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var monthStart))
            {
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                return (monthStart, monthEnd);
            }
        }

        return range.ToUpperInvariant() switch
        {
            "24H" => (today.AddDays(-1), today),
            "7D" => (today.AddDays(-7), today),
            "30D" => (today.AddDays(-30), today),
            "THISMONTH" => (new DateOnly(today.Year, today.Month, 1), today),
            _ => (today.AddDays(-7), today)
        };
    }
}
