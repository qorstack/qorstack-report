namespace QorstackReportService.Domain.Enums;

/// <summary>
/// Status of a document template
/// </summary>
public enum TemplateStatus
{
    /// <summary>
    /// Template is active and can be used for report generation
    /// </summary>
    Active,

    /// <summary>
    /// Template is inactive and cannot be used
    /// </summary>
    Inactive
}
