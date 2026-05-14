namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Service interface for Barcode generation
/// </summary>
public interface IBarcodeService
{
    /// <summary>
    /// Generates a Barcode image from the given text
    /// </summary>
    /// <param name="text">The text/data to encode in the Barcode</param>
    /// <param name="options">Barcode generation options</param>
    /// <returns>The Barcode image as a PNG byte array</returns>
    byte[] GenerateBarcode(string text, BarcodeOptions options);
}

/// <summary>
/// Options for Barcode generation
/// </summary>
public class BarcodeOptions
{
    /// <summary>
    /// Width of the barcode in pixels
    /// </summary>
    public int Width { get; set; } = 300;

    /// <summary>
    /// Height of the barcode in pixels
    /// </summary>
    public int Height { get; set; } = 100;

    /// <summary>
    /// Format of the barcode (e.g. Code128, EAN13, QR_CODE)
    /// </summary>
    public string Format { get; set; } = "Code128";

    /// <summary>
    /// Whether to include the text label below the barcode
    /// </summary>
    public bool IncludeText { get; set; } = true;

    /// <summary>
    /// Foreground color (hex)
    /// </summary>
    public string? Color { get; set; } = "#000000";

    /// <summary>
    /// Background color (hex)
    /// </summary>
    public string? BackgroundColor { get; set; } = "#FFFFFF";

    /// <summary>
    /// Whether to draw quiet zones/margins. Default is true.
    /// </summary>
    public bool DrawQuietZones { get; set; } = true;
}
