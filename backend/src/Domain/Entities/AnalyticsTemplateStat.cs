using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// Pre-computed template-level analytics per user for performance matrix
/// </summary>
public partial class AnalyticsTemplateStat
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid? TemplateVersionId { get; set; }

    public DateOnly StatDate { get; set; }

    public int TotalCount { get; set; }

    public int SuccessCount { get; set; }

    public int FailedCount { get; set; }

    public long TotalDurationMs { get; set; }

    public long TotalFileSizeBytes { get; set; }

    public DateTime? LastGeneratedAt { get; set; }

    public virtual TemplateVersion? TemplateVersion { get; set; }

    public virtual User User { get; set; } = null!;
}
