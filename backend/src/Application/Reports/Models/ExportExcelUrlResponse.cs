using System.Text.Json.Serialization;

namespace QorstackReportService.Application.Reports.Models;

/// <summary>
/// Response model for Excel export returning a URL
/// </summary>
public class ExportExcelUrlResponse
{
    [JsonPropertyName("jobId")]
    public Guid JobId { get; set; }

    [JsonPropertyName("downloadUrl")]
    public string? DownloadUrl { get; set; }

    [JsonPropertyName("expiresIn")]
    public int ExpiresIn { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "success";

    /// <summary>The file type that was produced ("xlsx", "pdf")</summary>
    [JsonPropertyName("fileType")]
    public string FileType { get; set; } = "xlsx";

    [JsonPropertyName("isZipped")]
    public bool IsZipped { get; set; }
}
