namespace QorstackReportService.Application.Reports.Models;

/// <summary>
/// Request size limits for the render endpoints (config section <c>Render</c>, env <c>RENDER_MAX_*</c>).
/// 0 means unlimited. They protect small servers from oversized payloads; raise them if your hardware allows.
/// </summary>
public sealed class RenderLimits
{
    public const string SectionName = "Render";

    /// <summary>Max request body in MB (env RENDER_MAX_BODY_MB). 0 = unlimited.</summary>
    public int MaxBodyMb { get; set; } = 30;

    /// <summary>Max rows per table (env RENDER_MAX_TABLE_ROWS). 0 = unlimited.</summary>
    public int MaxTableRows { get; set; } = 50_000;

    /// <summary>Max items in replace / image / qrcode / barcode, each (env RENDER_MAX_ITEMS_PER_FIELD). 0 = unlimited.</summary>
    public int MaxItemsPerField { get; set; } = 1_000;

    public static RenderLimits Default { get; } = new();
}
