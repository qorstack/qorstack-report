using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Service for post-processing PDF files (password protection, watermarks)
/// </summary>
public interface IPdfPostProcessingService
{
    /// <summary>
    /// Apply post-processing (password protection and/or watermark) to a PDF byte array.
    /// Returns the original bytes if no post-processing is needed.
    /// </summary>
    Task<byte[]> ProcessAsync(byte[] pdfBytes, PdfPasswordOptions? passwordOptions, PdfWatermarkOptions? watermarkOptions, CancellationToken cancellationToken = default);
}
