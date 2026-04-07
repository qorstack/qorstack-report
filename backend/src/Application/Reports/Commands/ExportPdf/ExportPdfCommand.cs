using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Reports.Models;

namespace QorstackReportService.Application.Reports.Commands.ExportPdf;

public class ExportPdfCommand : IRequest<RenderResult>
{
    public Guid UserId { get; set; }
    public string TemplateKey { get; set; } = string.Empty;
    public bool Async { get; set; } = false;
    public DocumentProcessingData Data { get; set; } = new();
    public bool IsSandbox { get; set; }

    /// <summary>File type: "pdf" (default) | "docx"</summary>
    public string FileType { get; set; } = "pdf";

    /// <summary>Wrap output in a .zip archive</summary>
    public bool ZipOutput { get; set; }

    public PdfPasswordOptions? PdfPassword { get; set; }
    public PdfWatermarkOptions? Watermark { get; set; }
}
