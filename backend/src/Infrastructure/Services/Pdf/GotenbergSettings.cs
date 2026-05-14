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

    /// <summary>
    /// Local path where font files should be written so Gotenberg can access them.
    /// Mount this path into the Gotenberg container at /usr/share/fonts/custom.
    /// </summary>
    public string? FontsPath { get; set; }
}
