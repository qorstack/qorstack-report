namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Service interface for Gotenberg PDF conversion operations
/// </summary>
public interface IGotenbergService
{
    /// <summary>
    /// Converts a DOCX document to PDF format using default options.
    /// Fonts must be pre-installed in the Gotenberg container (via fonts/ directory volume mount).
    /// </summary>
    /// <param name="docxStream">The DOCX document stream</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The PDF document as a byte array</returns>
    Task<byte[]> ConvertDocxToPdfAsync(Stream docxStream, CancellationToken cancellationToken = default);

    /// <summary>
    /// Converts a DOCX document to PDF format with custom options.
    /// Fonts must be pre-installed in the Gotenberg container (via fonts/ directory volume mount).
    /// </summary>
    /// <param name="docxStream">The DOCX document stream</param>
    /// <param name="options">Conversion options</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The PDF document as a byte array</returns>
    Task<byte[]> ConvertDocxToPdfAsync(Stream docxStream, PdfConversionOptions options, CancellationToken cancellationToken = default);
}

/// <summary>
/// Options for PDF conversion
/// When null, the original document settings from the DOCX file will be preserved
/// </summary>
public class PdfConversionOptions
{
    /// <summary>
    /// Page orientation (portrait or landscape)
    /// When null, uses the orientation from the source DOCX document
    /// </summary>
    public string? Orientation { get; set; }

    /// <summary>
    /// Paper size (e.g., A4, Letter)
    /// When null, uses the paper size from the source DOCX document
    /// </summary>
    public string? PaperSize { get; set; }

    /// <summary>
    /// Top margin in inches
    /// When null, uses the margin from the source DOCX document
    /// </summary>
    public float? MarginTop { get; set; }

    /// <summary>
    /// Bottom margin in inches
    /// When null, uses the margin from the source DOCX document
    /// </summary>
    public float? MarginBottom { get; set; }

    /// <summary>
    /// Left margin in inches
    /// When null, uses the margin from the source DOCX document
    /// </summary>
    public float? MarginLeft { get; set; }

    /// <summary>
    /// Right margin in inches
    /// When null, uses the margin from the source DOCX document
    /// </summary>
    public float? MarginRight { get; set; }

    /// <summary>
    /// Whether to use the original document settings (margins, orientation, paper size)
    /// from the source DOCX file. Default is true.
    /// When true, individual settings (Orientation, Margins, PaperSize) are ignored.
    /// </summary>
    public bool UseOriginalDocumentSettings { get; set; } = true;
}

