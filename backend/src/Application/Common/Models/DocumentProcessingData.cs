using System.Text.Json.Serialization;
using QorstackReportService.Application.Common.JsonConverters;

namespace QorstackReportService.Application.Common.Models;

/// <summary>
/// Data model for document template processing
/// </summary>
public class DocumentProcessingData
{
    /// <summary>
    /// Simple variable replacements ({{variable}} markers)
    /// </summary>
    [JsonPropertyName("replace")]
    public Dictionary<string, string?> Replace { get; set; } = new();

    /// <summary>
    /// Table data for index-based table mapping
    /// The outer list represents tables in the document (by order of appearance).
    /// </summary>
    [JsonPropertyName("table")]
    public List<TableData> Table { get; set; } = new();

    /// <summary>
    /// Image data for image markers ({{image:name}})
    /// </summary>
    [JsonPropertyName("image")]
    public Dictionary<string, ImageData?> Image { get; set; } = new();

    /// <summary>
    /// QR code data for QR markers ({{qr:name}})
    /// </summary>
    [JsonPropertyName("qrcode")]
    public Dictionary<string, QrCodeData?> Qrcode { get; set; } = new();

    /// <summary>
    /// Barcode data for barcode markers ({{barcode:name}})
    /// </summary>
    [JsonPropertyName("barcode")]
    public Dictionary<string, BarcodeData?> Barcode { get; set; } = new();

    /// <summary>
    /// PDF password protection options
    /// </summary>
    [JsonPropertyName("pdfPassword")]
    public PdfPasswordOptions? PdfPassword { get; set; }

    /// <summary>
    /// PDF watermark options
    /// </summary>
    [JsonPropertyName("watermark")]
    public PdfWatermarkOptions? Watermark { get; set; }
}

/// <summary>
/// Data for table processing
/// </summary>
public class TableData
{
    /// <summary>
    /// The rows of data for the table
    /// </summary>
    [JsonPropertyName("rows")]
    public List<Dictionary<string, object?>> Rows { get; set; } = new();

    /// <summary>
    /// Future use: Sort configuration
    /// </summary>
    [JsonPropertyName("sort")]
    [JsonConverter(typeof(SortDefinitionConverter))]
    public List<SortDefinition>? Sort { get; set; }

    /// <summary>
    /// Fields to group/merge vertically (supports single string or array of strings)
    /// </summary>
    [JsonPropertyName("verticalMerge")]
    [JsonConverter(typeof(StringOrArrayConverter))]
    public List<string>? VerticalMergeFields { get; set; }

    /// <summary>
    /// Fields to collapse data by (supports single string or array of strings)
    /// </summary>
    [JsonPropertyName("collapse")]
    [JsonConverter(typeof(StringOrArrayConverter))]
    public List<string>? CollapseFields { get; set; }

    /// <summary>
    /// Repeat header row at the top of each page (Word only)
    /// </summary>
    [JsonPropertyName("repeatHeader")]
    public bool RepeatHeader { get; set; }

    // === Excel-Specific Properties (ignored by DOCX processing) ===

    /// <summary>
    /// Enable auto-filter on the header row (Excel only)
    /// </summary>
    [JsonPropertyName("autoFilter")]
    public bool AutoFilter { get; set; }

    /// <summary>
    /// Freeze the header row so it stays visible when scrolling (Excel only)
    /// </summary>
    [JsonPropertyName("freezeHeader")]
    public bool FreezeHeader { get; set; }

    /// <summary>
    /// Auto-fit column widths to content (Excel only)
    /// </summary>
    [JsonPropertyName("autoFitColumns")]
    public bool AutoFitColumns { get; set; }

    /// <summary>
    /// Convert the table region to a native Excel Table/ListObject (Excel only)
    /// </summary>
    [JsonPropertyName("asExcelTable")]
    public bool AsExcelTable { get; set; }

    /// <summary>
    /// Excel Table style name when asExcelTable is true (e.g., "TableStyleMedium2")
    /// </summary>
    [JsonPropertyName("excelTableStyle")]
    public string? ExcelTableStyle { get; set; }

    /// <summary>
    /// Enable Excel Outline grouping (expand/collapse in Excel UI) for grouped data
    /// </summary>
    [JsonPropertyName("outline")]
    public bool Outline { get; set; }

    /// <summary>
    /// Auto-generate total formulas below the table. Key = field name, Value = function (SUM, AVERAGE, COUNT, MIN, MAX)
    /// </summary>
    [JsonPropertyName("generateTotals")]
    public Dictionary<string, string>? GenerateTotals { get; set; }

    /// <summary>
    /// Apply number formats to specific fields. Key = field name, Value = Excel number format string (e.g., "#,##0.00")
    /// </summary>
    [JsonPropertyName("numberFormat")]
    public Dictionary<string, string>? NumberFormat { get; set; }

    /// <summary>
    /// Conditional formatting rules for specific fields (Excel only)
    /// </summary>
    [JsonPropertyName("conditionalFormat")]
    public List<ConditionalFormatConfig>? ConditionalFormat { get; set; }

    /// <summary>
    /// Split table data into multiple sheets by a field value (Excel only)
    /// </summary>
    [JsonPropertyName("splitToSheets")]
    public SplitToSheetsConfig? SplitToSheets { get; set; }
}

/// <summary>
/// Configuration for conditional formatting on a field
/// </summary>
public class ConditionalFormatConfig
{
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    [JsonPropertyName("rules")]
    public List<ConditionalFormatRule> Rules { get; set; } = new();
}

/// <summary>
/// A single conditional formatting rule
/// </summary>
public class ConditionalFormatRule
{
    /// <summary>
    /// Exact value match (for text fields)
    /// </summary>
    [JsonPropertyName("value")]
    public object? Value { get; set; }

    /// <summary>
    /// Comparison operator for numeric fields: greaterThan, lessThan, between, equal
    /// </summary>
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

/// <summary>
/// Configuration for splitting table data into multiple sheets
/// </summary>
public class SplitToSheetsConfig
{
    /// <summary>
    /// Field name to split by — each unique value creates a new sheet
    /// </summary>
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    /// <summary>
    /// Name of the template sheet to clone (defaults to current sheet)
    /// </summary>
    [JsonPropertyName("templateSheet")]
    public string? TemplateSheet { get; set; }
}

/// <summary>
/// Data for image insertion
/// </summary>
public class ImageData
{
    /// <summary>
    /// The image source (URL or base64 string)
    /// </summary>
    public string Src { get; set; } = string.Empty;

    /// <summary>
    /// Optional width in pixels (EMUs will be calculated)
    /// </summary>
    public int? Width { get; set; }

    /// <summary>
    /// Optional height in pixels (EMUs will be calculated)
    /// </summary>
    public int? Height { get; set; }

    /// <summary>
    /// How the image should fit: "contain", "cover", or "fill"
    /// Default is "cover" to fill the container while maintaining aspect ratio
    /// </summary>
    [JsonPropertyName("fit")]
    public string? ObjectFit { get; set; }
}

/// <summary>
/// Data for QR code generation
/// </summary>
public class QrCodeData
{
    /// <summary>
    /// The text/data to encode in the QR code
    /// </summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Size of the QR code in pixels
    /// </summary>
    public int Size { get; set; } = 120;

    /// <summary>
    /// URL or Base64 of the logo to embed in the center
    /// </summary>
    public string? Logo { get; set; }

    /// <summary>
    /// Color in hex format (e.g. #000000)
    /// </summary>
    public string? Color { get; set; }

    /// <summary>
    /// Background color (hex)
    /// </summary>
    public string? BackgroundColor { get; set; }
}

/// <summary>
/// Data for Barcode generation
/// </summary>
public class BarcodeData
{
    /// <summary>
    /// The text/data to encode in the Barcode
    /// </summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Format of the barcode (e.g., Code128, EAN13)
    /// </summary>
    public string Format { get; set; } = "Code128";

    /// <summary>
    /// Width of the barcode in pixels
    /// </summary>
    public int Width { get; set; } = 300;

    /// <summary>
    /// Height of the barcode in pixels
    /// </summary>
    public int Height { get; set; } = 100;

    /// <summary>
    /// Include the value text below the barcode
    /// </summary>
    public bool IncludeText { get; set; } = true;

    /// <summary>
    /// Color in hex format (e.g. #000000)
    /// </summary>
    public string? Color { get; set; } = "#000000";

    /// <summary>
    /// Background color (hex)
    /// </summary>
    public string? BackgroundColor { get; set; } = "#FFFFFF";
}

/// <summary>
/// Options for PDF password protection
/// </summary>
public class PdfPasswordOptions
{
    /// <summary>
    /// Password required to open the PDF (user password)
    /// </summary>
    [JsonPropertyName("userPassword")]
    public string? UserPassword { get; set; }

    /// <summary>
    /// Password required for full access (owner password) - controls editing, printing permissions
    /// </summary>
    [JsonPropertyName("ownerPassword")]
    public string? OwnerPassword { get; set; }

    /// <summary>
    /// Restrict printing the PDF (requires ownerPassword)
    /// </summary>
    [JsonPropertyName("restrictPrinting")]
    public bool RestrictPrinting { get; set; }

    /// <summary>
    /// Restrict copying content from the PDF (requires ownerPassword)
    /// </summary>
    [JsonPropertyName("restrictCopying")]
    public bool RestrictCopying { get; set; }

    /// <summary>
    /// Restrict modifying the PDF (requires ownerPassword)
    /// </summary>
    [JsonPropertyName("restrictModifying")]
    public bool RestrictModifying { get; set; }
}

/// <summary>
/// Options for PDF watermark (text or image)
/// </summary>
public class PdfWatermarkOptions
{
    /// <summary>
    /// Watermark type: "text" or "image"
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = "text";

    /// <summary>
    /// Text content for text watermark
    /// </summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    /// <summary>
    /// Image source (URL or base64) for image watermark
    /// </summary>
    [JsonPropertyName("imageSrc")]
    public string? ImageSrc { get; set; }

    /// <summary>
    /// Font size for text watermark (default: 48)
    /// </summary>
    [JsonPropertyName("fontSize")]
    public double FontSize { get; set; } = 48;

    /// <summary>
    /// Font family for text watermark (default: Helvetica)
    /// </summary>
    [JsonPropertyName("fontFamily")]
    public string FontFamily { get; set; } = "Helvetica";

    /// <summary>
    /// Color in hex format for text watermark (default: #000000)
    /// </summary>
    [JsonPropertyName("color")]
    public string Color { get; set; } = "#000000";

    /// <summary>
    /// Opacity from 0.0 to 1.0 (default: 0.15)
    /// </summary>
    [JsonPropertyName("opacity")]
    public double Opacity { get; set; } = 0.15;

    /// <summary>
    /// Rotation angle in degrees (default: -45 for diagonal)
    /// </summary>
    [JsonPropertyName("rotation")]
    public double Rotation { get; set; } = -45;

    /// <summary>
    /// Horizontal position: "left", "center", "right", or a number (points from left)
    /// </summary>
    [JsonPropertyName("positionX")]
    public string PositionX { get; set; } = "center";

    /// <summary>
    /// Vertical position: "top", "center", "bottom", or a number (points from bottom)
    /// </summary>
    [JsonPropertyName("positionY")]
    public string PositionY { get; set; } = "center";

    /// <summary>
    /// Width for image watermark in points (optional, auto-scales if only width or height is set)
    /// </summary>
    [JsonPropertyName("width")]
    public double? Width { get; set; }

    /// <summary>
    /// Height for image watermark in points (optional, auto-scales if only width or height is set)
    /// </summary>
    [JsonPropertyName("height")]
    public double? Height { get; set; }

    /// <summary>
    /// Apply watermark to specific pages only (e.g., [1, 3, 5]). Null = all pages
    /// </summary>
    [JsonPropertyName("pages")]
    public List<int>? Pages { get; set; }
}
