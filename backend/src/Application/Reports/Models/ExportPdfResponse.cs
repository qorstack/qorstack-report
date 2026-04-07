using System.Text.Json.Serialization;

namespace QorstackReportService.Application.Reports.Models;

/// <summary>
/// Unified response for all render endpoints (PDF, Excel, etc.)
/// </summary>
public class RenderResponse
{
    [JsonPropertyName("jobId")]
    public Guid JobId { get; set; }

    [JsonPropertyName("downloadUrl")]
    public string? DownloadUrl { get; set; }

    [JsonPropertyName("expiresIn")]
    public int ExpiresIn { get; set; }

    /// <summary>pdf | xlsx | docx | zip</summary>
    [JsonPropertyName("fileType")]
    public string FileType { get; set; } = "pdf";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "success";

    [JsonPropertyName("isZipped")]
    public bool IsZipped { get; set; }
}

/// <summary>Alias kept for backward compatibility with Render.cs endpoint declarations</summary>
public class ExportPdfUrlResponse : RenderResponse { }

/// <summary>
/// Internal result shared by all render command handlers
/// </summary>
public class RenderResult
{
    public Guid JobId { get; set; }
    public string Status { get; set; } = "success";
    public string? DownloadUrl { get; set; }
    public int? ExpiresIn { get; set; }
    public string FileType { get; set; } = "pdf";
    public bool IsZipped { get; set; }
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Response model for async export
/// </summary>
public class ExportPdfAsyncResponse
{
    [JsonPropertyName("jobId")]
    public Guid JobId { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "pending";

    [JsonPropertyName("statusUrl")]
    public string? StatusUrl { get; set; }
}
