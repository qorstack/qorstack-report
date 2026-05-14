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

    /// <summary>Wrap output in a .zip archive</summary>
    public bool ZipOutput { get; set; }
}
