using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Reports.Commands;
using QorstackReportService.Application.Reports.Models;

namespace QorstackReportService.Application.Reports.Commands.ExportExcel;

public class ExportExcelCommand : IRequest<RenderResult>, IRenderJobCommand
{
    /// <summary>Set for async renders: the pre-created (pending) report job this run fills in.</summary>
    public Guid? JobId { get; set; }

    public string SourceType => "template-excel";

    public Guid UserId { get; set; }
    public string TemplateKey { get; set; } = string.Empty;
    /// <summary>Stored version number to render; null = the current (active) version.</summary>
    public int? TemplateVersion { get; set; }
    public bool Async { get; set; } = false;
    public DocumentProcessingData Data { get; set; } = new();
    public bool IsSandbox { get; set; }

    /// <summary>Wrap output in a .zip archive</summary>
    public bool ZipOutput { get; set; }

    /// <summary>Optional download file name (without extension) from the request payload.
    /// When set, it drives the Content-Disposition of the returned download URL.</summary>
    public string? FileName { get; set; }

    /// <summary>When true (sandbox only), also convert the result to PDF and return pdfPreviewUrl</summary>
    public bool SandboxGeneratePdfPreview { get; set; }
}
