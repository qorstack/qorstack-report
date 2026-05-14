using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Analytics.Models;

namespace QorstackReportService.Application.Analytics.Queries.GetTemplatePerformance;

public record GetTemplatePerformanceQuery(
    string Range = "7D",
    Guid? ProjectId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null
) : IRequest<List<TemplatePerformanceDto>>;

public class GetTemplatePerformanceQueryHandler : IRequestHandler<GetTemplatePerformanceQuery, List<TemplatePerformanceDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public GetTemplatePerformanceQueryHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<List<TemplatePerformanceDto>> Handle(GetTemplatePerformanceQuery request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null) return new List<TemplatePerformanceDto>();
        var userId = Guid.Parse(userIdStr);

        // Resolve date range filter as DateOnly
        DateOnly? fromDate = null;
        DateOnly? toDate = null;

        if (request.FromDate.HasValue)
            fromDate = DateOnly.FromDateTime(request.FromDate.Value);

        if (request.ToDate.HasValue)
            toDate = DateOnly.FromDateTime(request.ToDate.Value);

        if (!fromDate.HasValue && !string.IsNullOrEmpty(request.Range))
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            fromDate = request.Range.ToUpperInvariant() switch
            {
                "24H" => today.AddDays(-1),
                "7D" => today.AddDays(-7),
                "30D" => today.AddDays(-30),
                "THISMONTH" => new DateOnly(today.Year, today.Month, 1),
                _ => today.AddDays(-7)
            };
            // If using range, default to today as end date if not specified
            if (!toDate.HasValue) toDate = today;
        }

        // Read from pre-computed analytics_template_stats
        var query = _context.AnalyticsTemplateStats
            .Where(s => s.UserId == userId && s.TemplateVersionId != null);

        if (fromDate.HasValue)
            query = query.Where(s => s.StatDate >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(s => s.StatDate <= toDate.Value);

        var stats = await query.ToListAsync(cancellationToken);

        // Resolve template metadata
        var versionIds = stats.Select(s => s.TemplateVersionId!.Value).Distinct().ToList();
        var versionInfo = await _context.TemplateVersions
            .Where(v => versionIds.Contains(v.Id))
            .Include(v => v.Template)
                .ThenInclude(t => t.Project)
            .ToListAsync(cancellationToken);

        var versionLookup = versionInfo.ToDictionary(v => v.Id);

        // Apply project filter
        if (request.ProjectId.HasValue)
        {
            var filteredVersionIds = versionInfo
                .Where(v => v.Template?.ProjectId == request.ProjectId.Value)
                .Select(v => v.Id)
                .ToHashSet();
            stats = stats.Where(s => filteredVersionIds.Contains(s.TemplateVersionId!.Value)).ToList();
        }

        // Filter valid stats
        var validStats = stats.Where(s => s.TemplateVersionId.HasValue && versionLookup.ContainsKey(s.TemplateVersionId.Value));

        // Group by TemplateId (combining all versions)
        var grouped = validStats.GroupBy(s => versionLookup[s.TemplateVersionId!.Value].TemplateId);

        return grouped.Select(g =>
        {
            // Get representative version for metadata (use the one with highest Version number if possible)
            var representativeStat = g.First();
            var representativeVersionId = representativeStat.TemplateVersionId!.Value;
            var templateVersion = versionLookup[representativeVersionId];

            // Try to find the latest version in this group for more accurate metadata
            foreach (var stat in g)
            {
                if (stat.TemplateVersionId.HasValue && versionLookup.TryGetValue(stat.TemplateVersionId.Value, out var v))
                {
                    if (v.Version > templateVersion.Version)
                    {
                        templateVersion = v;
                    }
                }
            }

            var templateKey = templateVersion.Template?.TemplateKey ?? "unknown";
            var templateName = templateVersion.Template?.Name ?? "Unknown";
            var projectName = templateVersion.Template?.Project?.Name ?? "Unknown";
            var filePath = templateVersion.FilePath ?? "";

            var type = filePath.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) ||
                       filePath.EndsWith(".xls", StringComparison.OrdinalIgnoreCase)
                ? "Excel" : "PDF";

            var totalGenerations = g.Sum(s => s.TotalCount);
            var errorCount = g.Sum(s => s.FailedCount);
            var totalDuration = g.Sum(s => s.TotalDurationMs);
            var avgDuration = totalGenerations > 0 ? (double)totalDuration / totalGenerations : 0;
            var totalFileSize = g.Sum(s => s.TotalFileSizeBytes);
            var avgFileSize = totalGenerations > 0 ? totalFileSize / totalGenerations : 0;
            var successRate = totalGenerations > 0 ? Math.Round(((double)(totalGenerations - errorCount) / totalGenerations) * 100, 1) : 0;
            var errorRate = totalGenerations > 0 ? Math.Round(((double)errorCount / totalGenerations) * 100, 1) : 0;
            var lastGeneratedAt = g.Max(s => s.LastGeneratedAt);

            return new TemplatePerformanceDto(
                templateKey, templateName, projectName, type,
                totalGenerations, avgDuration, avgFileSize,
                errorCount, successRate, errorRate, lastGeneratedAt);
        })
        .OrderByDescending(x => x.TotalGenerations)
        .ToList();
    }
}
