using System.Text.Json;
using System.Text.Json.Serialization;
using QorstackReportService.Application.Reports.Commands.ExportExcel;
using QorstackReportService.Application.Reports.Commands.ExportPdf;

namespace QorstackReportService.Application.Reports.Commands;

/// <summary>
/// Serializes a render command into <c>report_jobs.payload</c> and back, so a queued job can be rendered by any
/// backend instance, also after a restart. Shape: <c>{ "kind": "pdf" | "excel", "command": { ... } }</c>.
/// Table cell values round-trip as <see cref="JsonElement"/>, exactly as the synchronous path receives them.
/// </summary>
public static class RenderJobPayload
{
    private const string Pdf = "pdf";
    private const string Excel = "excel";

    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private sealed record Envelope(string Kind, JsonElement Command);

    public static string Serialize(IRenderJobCommand command)
    {
        var (kind, body) = command switch
        {
            ExportPdfCommand pdf => (Pdf, JsonSerializer.SerializeToElement(pdf, Options)),
            ExportExcelCommand excel => (Excel, JsonSerializer.SerializeToElement(excel, Options)),
            _ => throw new NotSupportedException($"Render command {command.GetType().Name} cannot be queued.")
        };
        return JsonSerializer.Serialize(new Envelope(kind, body), Options);
    }

    public static IRenderJobCommand Deserialize(string payload)
    {
        var envelope = JsonSerializer.Deserialize<Envelope>(payload, Options)
            ?? throw new InvalidDataException("Empty render job payload.");
        IRenderJobCommand? command = envelope.Kind switch
        {
            Pdf => envelope.Command.Deserialize<ExportPdfCommand>(Options),
            Excel => envelope.Command.Deserialize<ExportExcelCommand>(Options),
            _ => throw new InvalidDataException($"Unknown render job kind '{envelope.Kind}'.")
        };
        return command ?? throw new InvalidDataException("Empty render job command.");
    }
}
