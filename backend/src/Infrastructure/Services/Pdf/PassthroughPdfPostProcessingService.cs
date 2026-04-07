using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Infrastructure.Services.Pdf;

/// <summary>
/// Default PDF post-processing service for self-hosted (OSS) deployments.
/// Throws ProFeatureRequiredException when password or watermark options are requested,
/// so API callers receive a clear 403 PRO_REQUIRED response instead of silent no-op.
/// The Pro module replaces this with a real implementation via DI.
/// </summary>
public class PassthroughPdfPostProcessingService : IPdfPostProcessingService
{
    public Task<byte[]> ProcessAsync(
        byte[] pdfBytes,
        PdfPasswordOptions? passwordOptions,
        PdfWatermarkOptions? watermarkOptions,
        CancellationToken cancellationToken = default)
    {
        if (passwordOptions != null)
            throw new ProFeatureRequiredException("PDF Password Protection");

        if (watermarkOptions != null)
            throw new ProFeatureRequiredException("PDF Watermark");

        return Task.FromResult(pdfBytes);
    }
}
