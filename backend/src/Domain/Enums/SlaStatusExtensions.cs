namespace QorstackReportService.Domain.Enums;

/// <summary>
/// Extension methods for SlaStatus enum to convert to single-character status codes
/// </summary>
public static class SlaStatusExtensions
{
    /// <summary>
    /// Converts SlaStatus enum to its single-character string representation (S, P, R, or C)
    /// </summary>
    public static string ToStatusCode(this SlaStatus status) => status switch
    {
        SlaStatus.Success => "S",
        SlaStatus.Pause => "P",
        SlaStatus.Running => "R",
        SlaStatus.Cancel => "C",
        _ => "R" // Default to Running
    };

    /// <summary>
    /// Parses a single-character status code back to SlaStatus enum
    /// </summary>
    public static SlaStatus FromStatusCode(string? code) => code?.ToUpperInvariant() switch
    {
        "S" => SlaStatus.Success,
        "P" => SlaStatus.Pause,
        "R" => SlaStatus.Running,
        "C" => SlaStatus.Cancel,
        _ => SlaStatus.Running // Default to Running
    };
}
