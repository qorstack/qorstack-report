namespace QorstackReportService.Domain.Enums;

/// <summary>
/// Status of a client (tenant)
/// </summary>
public enum ClientStatus
{
    /// <summary>
    /// Client is active and can use the service
    /// </summary>
    Active,

    /// <summary>
    /// Client is inactive and cannot use the service
    /// </summary>
    Inactive,

    /// <summary>
    /// Client is suspended (e.g., due to payment issues or policy violations)
    /// </summary>
    Suspended
}
