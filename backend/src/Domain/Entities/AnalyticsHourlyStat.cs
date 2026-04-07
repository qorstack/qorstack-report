using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// Pre-computed hourly analytics per user for hourly usage panel
/// </summary>
public partial class AnalyticsHourlyStat
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public DateOnly StatDate { get; set; }

    public short StatHour { get; set; }

    public int TotalCount { get; set; }

    public virtual User User { get; set; } = null!;
}
