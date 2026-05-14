using QorstackReportService.Application.Reports.Models;
using System.Text.Json.Nodes;

namespace QorstackReportService.Application.Reports.Commands.RenderWithSandboxPayload;

/// <summary>
/// Command to render PDF from template using stored sandbox payload
/// </summary>
public class RenderWithSandboxPayloadCommand : IRequest<RenderResult>
{
    public Guid UserId { get; set; }
    public string TemplateKey { get; set; } = string.Empty;
    public bool Async { get; set; } = false;
    public string? FileName { get; set; }
    public JsonObject? SandboxPayload { get; set; }
}
