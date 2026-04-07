namespace QorstackReportService.Infrastructure.Services.Pdf;

/// <summary>
/// Configuration settings for Gotenberg PDF service
/// </summary>
public class GotenbergSettings
{
    /// <summary>
    /// Base URL of the Gotenberg service (e.g., "http://localhost:3000")
    /// </summary>
    public string BaseUrl { get; set; } = "http://localhost:3000";

    /// <summary>
    /// Timeout in seconds for PDF conversion requests
    /// </summary>
    public int TimeoutSeconds { get; set; } = 60;
}
