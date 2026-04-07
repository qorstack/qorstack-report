using System.Text.Json.Serialization;
using QorstackReportService.Application.Common.JsonConverters;
using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Application.Reports.Models;

/// <summary>
/// Base class for document processing request data (shared properties)
/// Contains: replace, image, qrcode, barcode, pdfPassword, watermark, zipOutput
/// </summary>
public abstract class DocumentProcessingRequestBase
{
    /// <summary>
    /// Simple variable replacements ({{variable}} markers)
    /// </summary>
    [JsonPropertyName("replace")]
    public Dictionary<string, string>? Replace { get; set; }

    /// <summary>
    /// Image data for image markers ({{image:name}})
    /// </summary>
    [JsonPropertyName("image")]
    public Dictionary<string, ImageDataRequest>? Image { get; set; }

    /// <summary>
    /// QR code data for QR markers ({{qr:name}})
    /// </summary>
    [JsonPropertyName("qrcode")]
    public Dictionary<string, QrCodeDataRequest>? QrCode { get; set; }

    /// <summary>
    /// Barcode data for barcode markers ({{barcode:name}})
    /// </summary>
    [JsonPropertyName("barcode")]
    public Dictionary<string, BarcodeDataRequest>? Barcode { get; set; }

    /// <summary>
    /// PDF password protection options
    /// </summary>
    [JsonPropertyName("pdfPassword")]
    public PdfPasswordRequest? PdfPassword { get; set; }

    /// <summary>
    /// PDF watermark options (text or image)
    /// </summary>
    [JsonPropertyName("watermark")]
    public PdfWatermarkRequest? Watermark { get; set; }

    /// <summary>
    /// Wrap the output file in a .zip archive before returning the download URL
    /// </summary>
    [JsonPropertyName("zipOutput")]
    public bool ZipOutput { get; set; }
}

/// <summary>
/// Request DTO for table data
/// </summary>
public class TableDataRequest
{
    [JsonPropertyName("rows")]
    public List<Dictionary<string, object>> Rows { get; set; } = new();

    [JsonPropertyName("sort")]
    [JsonConverter(typeof(SortDefinitionConverter))]
    public List<SortDefinition>? Sort { get; set; }

    [JsonPropertyName("verticalMerge")]
    [JsonConverter(typeof(StringOrArrayConverter))]
    public List<string>? VerticalMerge { get; set; }

    [JsonPropertyName("collapse")]
    [JsonConverter(typeof(StringOrArrayConverter))]
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

    [JsonPropertyName("generateTotals")]
    public Dictionary<string, string>? GenerateTotals { get; set; }

    [JsonPropertyName("numberFormat")]
    public Dictionary<string, string>? NumberFormat { get; set; }

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
public class ImageDataRequest
{
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
public class QrCodeDataRequest
{
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
public class BarcodeDataRequest
{
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
    [JsonPropertyName("type")]
    public string Type { get; set; } = "text";

    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("imageSrc")]
    public string? ImageSrc { get; set; }

    [JsonPropertyName("fontSize")]
    public double FontSize { get; set; } = 48;

    [JsonPropertyName("fontFamily")]
    public string FontFamily { get; set; } = "Helvetica";

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

    [JsonPropertyName("width")]
    public double? Width { get; set; }

    [JsonPropertyName("height")]
    public double? Height { get; set; }

    [JsonPropertyName("pages")]
    public List<int>? Pages { get; set; }
}
