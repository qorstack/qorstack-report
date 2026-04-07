using System.Text.Json.Serialization;

namespace QorstackReportService.Application.Reports.Models;

/// <summary>
/// Request model for Excel generation from stored template
/// Used by: POST /render/excel/template
/// </summary>
public class ExcelFromTemplateRequest : DocumentProcessingRequestBase
{
    /// <summary>
    /// Template key to use for generating the Excel file
    /// </summary>
    [JsonPropertyName("templateKey")]
    public string TemplateKey { get; set; } = string.Empty;

    /// <summary>
    /// Optional file name for the generated file (without extension)
    /// </summary>
    [JsonPropertyName("fileName")]
    public string? FileName { get; set; }

    /// <summary>
    /// File type to generate: "xlsx" (default) | "pdf"
    /// </summary>
    [JsonPropertyName("fileType")]
    public string FileType { get; set; } = "xlsx";

    [JsonPropertyName("table")]
    public List<ExcelTableDataRequest>? Table { get; set; }
}
