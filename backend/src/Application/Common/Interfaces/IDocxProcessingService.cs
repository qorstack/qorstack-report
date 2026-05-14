using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Service interface for processing Word documents with template data
/// </summary>
public interface IDocxProcessingService
{
    /// <summary>
    /// Processes a Word template with the provided data
    /// </summary>
    /// <param name="templateStream">The template document stream</param>
    /// <param name="data">The data to merge into the template</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A stream containing the processed document</returns>
    Task<Stream> ProcessTemplateAsync(Stream templateStream, DocumentProcessingData data, CancellationToken cancellationToken = default);

    /// <summary>
    /// Preprocesses a DOCX for preview generation (upload/update).
    /// Only flattens SDTs (Content Controls) — does NOT change fonts.
    /// Use this instead of ProcessTemplateAsync when you want to keep original fonts.
    /// </summary>
    Task<Stream> PreprocessForPreviewAsync(Stream templateStream, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates a template for correct marker syntax
    /// </summary>
    /// <param name="templateStream">The template document stream</param>
    /// <returns>Validation result with any errors found</returns>
    Task<TemplateValidationResult> ValidateTemplateAsync(Stream templateStream);

    /// <summary>
    /// Extracts all markers from a template
    /// </summary>
    /// <param name="templateStream">The template document stream</param>
    /// <returns>List of markers found in the template</returns>
    Task<List<TemplateMarker>> ExtractMarkersAsync(Stream templateStream);
}

/// <summary>
/// Result of template validation
/// </summary>
public class TemplateValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

/// <summary>
/// Represents a marker found in the template
/// </summary>
public class TemplateMarker
{
    public required string Name { get; set; }
    public required string Type { get; set; } // variable, table, image, qr, condition
    public string? RawText { get; set; }
    public bool IsTable { get; set; }
    public int? TableIndex { get; set; }
    /// <summary>
    /// Priority of the section (0=Header, 1=Body, 2=Footer) used for sorting variables
    /// </summary>
    public int SectionPriority { get; set; } = 0;
}
