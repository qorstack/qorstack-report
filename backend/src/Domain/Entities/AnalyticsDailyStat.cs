using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// Pre-computed daily analytics per user/project for dashboard performance
/// </summary>
public partial class AnalyticsDailyStat
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid? ProjectId { get; set; }

    public DateOnly StatDate { get; set; }

    public int TotalCount { get; set; }

    public int SuccessCount { get; set; }

    public int FailedCount { get; set; }

    public long TotalDurationMs { get; set; }

    public long TotalFileSizeBytes { get; set; }

    public virtual User User { get; set; } = null!;
}
