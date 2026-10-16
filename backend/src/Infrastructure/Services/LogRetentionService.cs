using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services;

/// <summary>
/// Background service that runs daily and deletes report job logs (and their MinIO files)
/// for projects whose log_retention_days policy has been exceeded.
/// </summary>
public class LogRetentionService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<LogRetentionService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromHours(24);

    public LogRetentionService(
        IServiceScopeFactory scopeFactory,
        ILogger<LogRetentionService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Short startup delay so the database is fully ready before the first run
        await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunRetentionAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "[LogRetention] Retention run failed");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task RunRetentionAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IMinioStorageService>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        var reportBucket = StorageAreas.Reports;

        var projects = await context.Projects
            .Where(p => p.LogRetentionDays > 0)
            .Select(p => new { p.Id, p.LogRetentionDays })
            .ToListAsync(cancellationToken);

        if (projects.Count == 0)
            return;

        var totalDeleted = 0;

        foreach (var project in projects)
        {
            var cutoff = DateTime.UtcNow.AddDays(-project.LogRetentionDays);

            // Find expired jobs via TemplateVersion → Template → Project
            var expiredJobs = await (
                from j in context.ReportJobs
                join tv in context.TemplateVersions on j.TemplateVersionId equals (Guid?)tv.Id
                where tv.Template.ProjectId == project.Id && j.CreatedDatetime < cutoff
                select new { j.Id, j.OutputFilePath }
            ).ToListAsync(cancellationToken);

            if (expiredJobs.Count == 0)
                continue;

            // Delete MinIO files best-effort
            foreach (var path in expiredJobs
                .Where(j => !string.IsNullOrEmpty(j.OutputFilePath))
                .Select(j => j.OutputFilePath!))
            {
                try
                {
                    await storage.DeleteFileAsync(reportBucket, path);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[LogRetention] Failed to delete file {Path}", path);
                }
            }

            // Batch-delete the DB records
            var jobIds = expiredJobs.Select(j => j.Id).ToList();
            var deleted = await context.ReportJobs
                .Where(j => jobIds.Contains(j.Id))
                .ExecuteDeleteAsync(cancellationToken);

            totalDeleted += deleted;
        }

        if (totalDeleted > 0)
            _logger.LogInformation("[LogRetention] Deleted {Count} expired report job log(s)", totalDeleted);
        else
            _logger.LogDebug("[LogRetention] No expired logs found");
    }
}
