using System.Text.Json;
using System.Text.Json.Serialization;
using QorstackReportService.Application.Common.JsonConverters;
using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Application.Reports.Models;

/// <summary>
/// Base class for document processing request data (shared properties)
/// Contains: replace, image, qrcode, barcode, zipOutput
/// </summary>
public abstract class DocumentProcessingRequestBase
{
    /// <summary>
    /// Simple variable replacements ({{variable}} markers): <c>[{ "key": "customer_name", "value": "ACME" }]</c>.
    /// </summary>
    [JsonPropertyName("replace")]
    [KeyedList("replace")]
    public List<KeyValueRequest>? Replace { get; set; }

    /// <summary>
    /// Image data for image markers ({{image:name}}): <c>[{ "key": "logo", "src": "..." }]</c>.
    /// </summary>
    [JsonPropertyName("image")]
    [KeyedList("image")]
    public List<ImageDataRequest>? Image { get; set; }

    /// <summary>
    /// QR code data for QR markers ({{qr:name}}): <c>[{ "key": "payment", "text": "..." }]</c>.
    /// </summary>
    [JsonPropertyName("qrcode")]
    [KeyedList("qrcode")]
    public List<QrCodeDataRequest>? QrCode { get; set; }

    /// <summary>
    /// Barcode data for barcode markers ({{barcode:name}}): <c>[{ "key": "sku", "text": "..." }]</c>.
    /// </summary>
    [JsonPropertyName("barcode")]
    [KeyedList("barcode")]
    public List<BarcodeDataRequest>? Barcode { get; set; }

    /// <summary>
    /// Pro: queue the render and return 202 with a job id instead of waiting for the file.
    /// Poll <c>GET /render/jobs/{jobId}</c> or pass <see cref="WebhookUrl"/>.
    /// </summary>
    [JsonPropertyName("async")]
    public bool Async { get; set; }

    /// <summary>
    /// Optional with <c>async: true</c>: an http(s) URL that receives a POST when the job finishes.
    /// </summary>
    [JsonPropertyName("webhookUrl")]
    public string? WebhookUrl { get; set; }

    /// <summary>
    /// Wrap the output file in a .zip archive before returning the download URL
    /// </summary>
    [JsonPropertyName("zipOutput")]
    public bool ZipOutput { get; set; }
}

/// <summary>
/// Request DTO for table data. Column names are listed once; each row holds the values in that order:
/// <c>{ "columns": ["item", "qty"], "rows": [["A", 2], ["B", 3]] }</c>.
/// </summary>
public class TableDataRequest
{
    /// <summary>
    /// Column marker names ({{row:name}} in the template), in the order of the row values. Unique, non-empty.
    /// </summary>
    [JsonPropertyName("columns")]
    [ArrayOnly("table.columns")]
    public List<string> Columns { get; set; } = new();

    /// <summary>
    /// Table rows; each row is an array of cell values (string, number, boolean or null) in <c>columns</c> order.
    /// </summary>
    [JsonPropertyName("rows")]
    [ArrayOnly("table.rows")]
    public List<List<JsonElement>> Rows { get; set; } = new();

    /// <summary>
    /// Sort rows before rendering: <c>[{ "field": "date", "direction": "desc" }]</c>.
    /// </summary>
    [JsonPropertyName("sort")]
    [ArrayOnly("table.sort")]
    public List<SortDefinition>? Sort { get; set; }

    /// <summary>
    /// Columns whose equal adjacent values are merged vertically: <c>["group"]</c>.
    /// </summary>
    [JsonPropertyName("verticalMerge")]
    [ArrayOnly("table.verticalMerge")]
    public List<string>? VerticalMerge { get; set; }

    /// <summary>
    /// Columns to group (collapse) rows by: <c>["category"]</c>.
    /// </summary>
    [JsonPropertyName("collapse")]
    [ArrayOnly("table.collapse")]
    public List<string>? Collapse { get; set; }
}

/// <summary>
/// Table data for Word (DOCX) rendering
/// </summary>
public class WordTableDataRequest : TableDataRequest
{
    /// <summary>
    /// Repeat the header row at the top of each page
    /// </summary>
    [JsonPropertyName("repeatHeader")]
    public bool RepeatHeader { get; set; }
}

/// <summary>
/// Table data for Excel rendering
/// </summary>
public class ExcelTableDataRequest : TableDataRequest
{
    [JsonPropertyName("autoFilter")]
    public bool AutoFilter { get; set; }

    [JsonPropertyName("freezeHeader")]
    public bool FreezeHeader { get; set; }

    [JsonPropertyName("autoFitColumns")]
    public bool AutoFitColumns { get; set; }

    [JsonPropertyName("asExcelTable")]
    public bool AsExcelTable { get; set; }

    [JsonPropertyName("excelTableStyle")]
    public string? ExcelTableStyle { get; set; }

    [JsonPropertyName("outline")]
    public bool Outline { get; set; }

    /// <summary>
    /// Totals per column: <c>[{ "key": "amount", "value": "sum" }]</c>
    /// </summary>
    [JsonPropertyName("generateTotals")]
    [KeyedList("table.generateTotals")]
    public List<KeyValueRequest>? GenerateTotals { get; set; }

    /// <summary>
    /// Number format per column: <c>[{ "key": "amount", "value": "#,##0.00" }]</c>
    /// </summary>
    [JsonPropertyName("numberFormat")]
    [KeyedList("table.numberFormat")]
    public List<KeyValueRequest>? NumberFormat { get; set; }

    [JsonPropertyName("conditionalFormat")]
    public List<ConditionalFormatConfigRequest>? ConditionalFormat { get; set; }

    [JsonPropertyName("splitToSheets")]
    public SplitToSheetsConfigRequest? SplitToSheets { get; set; }
}

public class ConditionalFormatConfigRequest
{
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    [JsonPropertyName("rules")]
    public List<ConditionalFormatRuleRequest> Rules { get; set; } = new();
}

public class ConditionalFormatRuleRequest
{
    [JsonPropertyName("value")]
    public object? Value { get; set; }

    [JsonPropertyName("operator")]
    public string? Operator { get; set; }

    [JsonPropertyName("fontColor")]
    public string? FontColor { get; set; }

    [JsonPropertyName("backgroundColor")]
    public string? BackgroundColor { get; set; }

    [JsonPropertyName("bold")]
    public bool? Bold { get; set; }

    [JsonPropertyName("italic")]
    public bool? Italic { get; set; }
}

public class SplitToSheetsConfigRequest
{
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    [JsonPropertyName("templateSheet")]
    public string? TemplateSheet { get; set; }
}

/// <summary>
/// Request DTO for image data
/// </summary>
public class ImageDataRequest : IKeyedRequestItem
{
    /// <summary>Image marker name ({{image:key}})</summary>
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("src")]
    public string Src { get; set; } = string.Empty;

    [JsonPropertyName("width")]
    public int? Width { get; set; }

    [JsonPropertyName("height")]
    public int? Height { get; set; }

    [JsonPropertyName("fit")]
    public string? Fit { get; set; }
}

/// <summary>
/// Request DTO for QR code data
/// </summary>
public class QrCodeDataRequest : IKeyedRequestItem
{
    /// <summary>QR marker name ({{qr:key}})</summary>
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    [JsonPropertyName("size")]
    public int Size { get; set; } = 120;

    [JsonPropertyName("color")]
    public string? Color { get; set; }

    [JsonPropertyName("backgroundColor")]
    public string? BackgroundColor { get; set; }

    [JsonPropertyName("logo")]
    public string? Logo { get; set; }
}

/// <summary>
/// Request DTO for barcode data
/// </summary>
public class BarcodeDataRequest : IKeyedRequestItem
{
    /// <summary>Barcode marker name ({{barcode:key}})</summary>
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    [JsonPropertyName("format")]
    public string Format { get; set; } = "Code128";

    [JsonPropertyName("width")]
    public int Width { get; set; } = 300;

    [JsonPropertyName("height")]
    public int Height { get; set; } = 100;

    [JsonPropertyName("includeText")]
    public bool IncludeText { get; set; } = true;

    [JsonPropertyName("color")]
    public string? Color { get; set; } = "#000000";

    [JsonPropertyName("backgroundColor")]
    public string? BackgroundColor { get; set; } = "#FFFFFF";
}

/// <summary>
/// Request DTO for PDF password protection
/// </summary>
public class PdfPasswordRequest
{
    [JsonPropertyName("userPassword")]
    public string? UserPassword { get; set; }

    [JsonPropertyName("ownerPassword")]
    public string? OwnerPassword { get; set; }

    [JsonPropertyName("restrictPrinting")]
    public bool RestrictPrinting { get; set; }

    [JsonPropertyName("restrictCopying")]
    public bool RestrictCopying { get; set; }

    [JsonPropertyName("restrictModifying")]
    public bool RestrictModifying { get; set; }
}

/// <summary>
/// Request DTO for PDF watermark
/// </summary>
public class PdfWatermarkRequest
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("fontSize")]
    public double FontSize { get; set; } = 48;

    /// <summary>
    /// Base font family name (e.g. "THSarabun", "Kanit", "Arial").
    /// Do NOT include the weight/style — pass those via FontWeight and FontItalic.
    /// For backward compatibility the service also accepts combined strings like
    /// "Kanit BoldItalic" but separate fields are preferred.
    /// </summary>
    [JsonPropertyName("fontFamily")]
    public string FontFamily { get; set; } = "Helvetica";

    /// <summary>
    /// Font weight 100–900 (100=Thin, 400=Regular, 700=Bold, 900=Black).
    /// When null, defaults to 400 (Regular) unless inferred from FontFamily.
    /// </summary>
    [JsonPropertyName("fontWeight")]
    public int? FontWeight { get; set; }

    /// <summary>
    /// Whether to use the italic variant of the font.
    /// </summary>
    [JsonPropertyName("fontItalic")]
    public bool? FontItalic { get; set; }

    [JsonPropertyName("color")]
    public string Color { get; set; } = "#000000";

    [JsonPropertyName("opacity")]
    public double Opacity { get; set; } = 0.15;

    [JsonPropertyName("rotation")]
    public double Rotation { get; set; } = -45;

    [JsonPropertyName("positionX")]
    public string PositionX { get; set; } = "center";

    [JsonPropertyName("positionY")]
    public string PositionY { get; set; } = "center";

    [JsonPropertyName("pages")]
    public List<int>? Pages { get; set; }
}
