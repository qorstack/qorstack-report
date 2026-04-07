using System.Text.Json.Serialization;

namespace QorstackReportService.Application.Reports.Models;

/// <summary>
/// Request model for PDF generation from stored template
/// Used by: POST /render/word/template
/// </summary>
public class PdfFromTemplateRequest : DocumentProcessingRequestBase
{
    /// <summary>
    /// Template key to use for generating the PDF
    /// </summary>
    [JsonPropertyName("templateKey")]
    public string TemplateKey { get; set; } = string.Empty;

    /// <summary>
    /// Optional file name for the output (without extension). If not provided, a UUID will be generated.
    /// </summary>
    [JsonPropertyName("fileName")]
    public string? FileName { get; set; }

    /// <summary>
    /// File type to generate: "pdf" (default) | "docx"
    /// </summary>
    [JsonPropertyName("fileType")]
    public string FileType { get; set; } = "pdf";

    [JsonPropertyName("table")]
    public List<WordTableDataRequest>? Table { get; set; }
}
