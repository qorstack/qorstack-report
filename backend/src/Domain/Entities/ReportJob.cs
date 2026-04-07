using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// Tracks report generation jobs: queued, processing, and completed.
/// </summary>
public partial class ReportJob : BaseAuditableEntity
{
    public Guid Id { get; set; }

    /// <summary>
    /// User who requested the report.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// API key used to submit the request, if any.
    /// </summary>
    public Guid? ApiKeyId { get; set; }

    /// <summary>
    /// Request source type (e.g. "template", "api").
    /// </summary>
    public string? SourceType { get; set; }

    /// <summary>
    /// Template version used for this job.
    /// </summary>
    public Guid? TemplateVersionId { get; set; }

    /// <summary>
    /// Job status: pending, processing, success, failed.
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// JSON payload submitted with the request.
    /// </summary>
    public string? RequestData { get; set; }

    /// <summary>
    /// Path to the output file in object storage.
    /// </summary>
    public string? OutputFilePath { get; set; }

    /// <summary>
    /// Error message if the job failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? FinishedAt { get; set; }

    /// <summary>
    /// Processing duration in milliseconds.
    /// </summary>
    public long? DurationMs { get; set; }

    /// <summary>
    /// Output file size in bytes.
    /// </summary>
    public long? FileSizeBytes { get; set; }

    /// <summary>
    /// Subscription this job was billed against.
    /// </summary>
    public Guid? SubscriptionId { get; set; }

    /// <summary>
    /// How the job was charged (e.g. "subscription", "credit", "free").
    /// </summary>
    public string? ChargedType { get; set; }

    public virtual ApiKey? ApiKey { get; set; }

    public virtual Subscription? Subscription { get; set; }

    public virtual TemplateVersion? TemplateVersion { get; set; }

    public virtual User User { get; set; } = null!;
}
