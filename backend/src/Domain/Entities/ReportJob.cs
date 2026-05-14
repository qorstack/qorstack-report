using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

public partial class ReportJob : BaseAuditableEntity
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid? ApiKeyId { get; set; }

    public string? SourceType { get; set; }

    public Guid? TemplateVersionId { get; set; }

    /// <summary>
    /// Job status: pending, processing, success, failed.
    /// </summary>
    public string? Status { get; set; }

    public string? RequestData { get; set; }

    public string? OutputFilePath { get; set; }

    public string? ErrorMessage { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? FinishedAt { get; set; }

    public long? DurationMs { get; set; }

    public long? FileSizeBytes { get; set; }

    public virtual ApiKey? ApiKey { get; set; }

    public virtual TemplateVersion? TemplateVersion { get; set; }

    public virtual User User { get; set; } = null!;
}
