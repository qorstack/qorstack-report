using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Service interface for processing Excel templates with template data (ClosedXML)
/// </summary>
public interface IExcelProcessingService
{
    /// <summary>
    /// Processes an Excel template (.xlsx) with the provided data
    /// </summary>
    /// <param name="templateStream">The template Excel stream</param>
    /// <param name="data">The data to merge into the template</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A stream containing the processed .xlsx workbook</returns>
    Task<Stream> ProcessTemplateAsync(Stream templateStream, DocumentProcessingData data, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates an Excel template for correct marker syntax
    /// </summary>
    /// <param name="templateStream">The template Excel stream</param>
    /// <returns>Validation result with any errors found</returns>
    Task<TemplateValidationResult> ValidateTemplateAsync(Stream templateStream);

    /// <summary>
    /// Extracts all markers from an Excel template
    /// </summary>
    /// <param name="templateStream">The template Excel stream</param>
    /// <returns>List of markers found in the template</returns>
    Task<List<TemplateMarker>> ExtractMarkersAsync(Stream templateStream);
}
