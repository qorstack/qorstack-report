namespace QorstackReportService.Application.Reports.Commands;

/// <summary>A render command (PDF/DOCX or Excel) that can run synchronously or from the async job queue.</summary>
public interface IRenderJobCommand : IRequest<Models.RenderResult>
{
    Guid UserId { get; }
    string TemplateKey { get; }
    int? TemplateVersion { get; }

    /// <summary>Render data (replace, tables, images, codes).</summary>
    Common.Models.DocumentProcessingData Data { get; }

    /// <summary>Set by the queue: the pending job row this run updates.</summary>
    Guid? JobId { get; set; }

    /// <summary>report_jobs.source_type value ("template" / "template-excel").</summary>
    string SourceType { get; }
}
