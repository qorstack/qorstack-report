using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Reports.Commands;
using QorstackReportService.Application.Reports.Models;

namespace QorstackReportService.Application.Reports.Commands.ExportPdf;

public class ExportPdfCommand : IRequest<RenderResult>, IRenderJobCommand
{
    /// <summary>Set for async renders: the pre-created (pending) report job this run fills in.</summary>
    public Guid? JobId { get; set; }

    public string SourceType => "template";

    public Guid UserId { get; set; }
    public string TemplateKey { get; set; } = string.Empty;
    /// <summary>Stored version number to render; null = the current (active) version.</summary>
    public int? TemplateVersion { get; set; }
    public bool Async { get; set; } = false;
    public DocumentProcessingData Data { get; set; } = new();
    public bool IsSandbox { get; set; }

    /// <summary>File type: "pdf" (default) | "docx"</summary>
    public string FileType { get; set; } = "pdf";

    /// <summary>Optional download file name (without extension) from the request payload.
    /// When set, it drives the Content-Disposition of the returned download URL.</summary>
    public string? FileName { get; set; }

    /// <summary>Wrap output in a .zip archive</summary>
    public bool ZipOutput { get; set; }

    public PdfPasswordOptions? PdfPassword { get; set; }
    public PdfWatermarkOptions? Watermark { get; set; }
}
