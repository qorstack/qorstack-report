using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

public partial class TemplateVersion : BaseAuditableEntity
{
    public Guid Id { get; set; }

    public Guid TemplateId { get; set; }

    public int Version { get; set; }

    public string FilePath { get; set; } = null!;

    public string? Status { get; set; }

    public string? PreviewFilePath { get; set; }

    public string? SandboxPayload { get; set; }

    public string? SandboxFilePath { get; set; }

    public virtual ICollection<AnalyticsTemplateStat> AnalyticsTemplateStats { get; set; } = new List<AnalyticsTemplateStat>();

    public virtual ICollection<ReportJob> ReportJobs { get; set; } = new List<ReportJob>();

    public virtual Template Template { get; set; } = null!;
}
