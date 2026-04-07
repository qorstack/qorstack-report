namespace QorstackReportService.Domain.Enums;

/// <summary>
/// Status of a report generation job
/// </summary>
public enum ReportJobStatus
{
    /// <summary>
    /// Job is pending and waiting to be processed
    /// </summary>
    Pending,

    /// <summary>
    /// Job is currently being processed
    /// </summary>
    Processing,

    /// <summary>
    /// Job completed successfully
    /// </summary>
    Success,

    /// <summary>
    /// Job failed with an error
    /// </summary>
    Failed
}
