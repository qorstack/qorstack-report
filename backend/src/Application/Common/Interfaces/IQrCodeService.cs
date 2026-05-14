namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Service interface for QR code generation
/// </summary>
public interface IQrCodeService
{
    /// <summary>
    /// Generates a QR code image from the given text
    /// </summary>
    /// <param name="text">The text/data to encode in the QR code</param>
    /// <param name="size">The size of the QR code in pixels (default: 200)</param>
    /// <returns>The QR code image as a PNG byte array</returns>
    byte[] GenerateQrCode(string text, int size = 200);

    /// <summary>
    /// Generates a QR code image with custom options
    /// </summary>
    /// <param name="text">The text/data to encode in the QR code</param>
    /// <param name="options">QR code generation options</param>
    /// <returns>The QR code image as a PNG byte array</returns>
    byte[] GenerateQrCode(string text, QrCodeOptions options);
}

/// <summary>
/// Options for QR code generation
/// </summary>
public class QrCodeOptions
{
    /// <summary>
    /// Size of the QR code in pixels
    /// </summary>
    public int Size { get; set; } = 200;

    /// <summary>
    /// Pixels per module (affects QR code density)
    /// </summary>
    public int PixelsPerModule { get; set; } = 10;

    /// <summary>
    /// Error correction level (L, M, Q, H)
    /// </summary>
    public string ErrorCorrectionLevel { get; set; } = "M";

    /// <summary>
    /// Foreground color in hex format (e.g., "#000000")
    /// </summary>
    public string Color { get; set; } = "#000000";

    /// <summary>
    /// Background color in hex format (e.g., "#FFFFFF")
    /// </summary>
    public string BackgroundColor { get; set; } = "#FFFFFF";

    /// <summary>
    /// Optional logo image data (bytes)
    /// </summary>
    public byte[]? LogoData { get; set; }

    /// <summary>
    /// Whether to draw the standard white quiet zones (padding) around the QR code.
    /// Default is true. Set to false to maximize the QR code within the specified size.
    /// </summary>
    public bool DrawQuietZones { get; set; } = true;
}
