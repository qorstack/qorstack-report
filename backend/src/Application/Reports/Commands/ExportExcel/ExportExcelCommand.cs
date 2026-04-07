using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Reports.Models;

namespace QorstackReportService.Application.Reports.Commands.ExportExcel;

public class ExportExcelCommand : IRequest<RenderResult>
{
    public Guid UserId { get; set; }
    public string TemplateKey { get; set; } = string.Empty;
    public bool Async { get; set; } = false;
    public DocumentProcessingData Data { get; set; } = new();
    public bool IsSandbox { get; set; }

    /// <summary>File type: "xlsx" (default) | "pdf"</summary>
    public string FileType { get; set; } = "xlsx";

    /// <summary>Wrap output in a .zip archive</summary>
    public bool ZipOutput { get; set; }

    /// <summary>PDF password protection (only when fileType = "pdf")</summary>
    public PdfPasswordOptions? PdfPassword { get; set; }

    /// <summary>PDF watermark (only when fileType = "pdf")</summary>
    public PdfWatermarkOptions? Watermark { get; set; }
}
