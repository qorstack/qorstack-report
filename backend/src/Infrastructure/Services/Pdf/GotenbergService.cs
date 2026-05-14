using System.Net.Http.Headers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services.Pdf;

/// <summary>
/// Gotenberg PDF conversion service implementation.
/// Fonts must be pre-installed in the Gotenberg container via the fonts/ volume mount.
/// Per-request font files are NOT supported by Gotenberg's LibreOffice endpoint.
/// </summary>
public class GotenbergService : IGotenbergService
{
    private readonly HttpClient _httpClient;
    private readonly GotenbergSettings _settings;
    private readonly ILogger<GotenbergService> _logger;

    // Gotenberg LibreOffice conversion endpoint
    private const string ConvertEndpoint = "/forms/libreoffice/convert";

    public GotenbergService(
        HttpClient httpClient,
        IOptions<GotenbergSettings> settings,
        ILogger<GotenbergService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;

        // Ensure BaseUrl has a scheme (http:// or https://)
        var baseUrl = _settings.BaseUrl;
        if (!baseUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !baseUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            baseUrl = $"http://{baseUrl}";
        }

        _httpClient.BaseAddress = new Uri(baseUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);

        // Optimization: Disable Expect: 100-continue for faster small requests
        _httpClient.DefaultRequestHeaders.ExpectContinue = false;

        _logger.LogInformation("Gotenberg client initialized with base URL: {BaseUrl}", baseUrl);
    }

    /// <inheritdoc />
    public async Task<byte[]> ConvertDocxToPdfAsync(Stream docxStream, CancellationToken cancellationToken = default)
    {
        return await ConvertDocxToPdfAsync(docxStream, new PdfConversionOptions(), cancellationToken);
    }

    /// <inheritdoc />
    public async Task<byte[]> ConvertDocxToPdfAsync(Stream docxStream, PdfConversionOptions options, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Starting DOCX to PDF conversion via Gotenberg (UseOriginalDocumentSettings: {UseOriginal})",
                options.UseOriginalDocumentSettings);

            using var content = new MultipartFormDataContent();

            // Add the DOCX file
            var fileContent = new StreamContent(docxStream);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            content.Add(fileContent, "files", "document.docx");

            // NOTE: Gotenberg's LibreOffice endpoint does NOT support per-request font files.
            // Fonts must be installed in the container OS. We use the fonts/ volume mount for this.
            // The old approach of attaching font files to the multipart form had NO effect.

            // Optimization: PDF/A-1b forces font embedding but is computationally expensive (2-3x slower).
            // Since we've confirmed fonts are installed on the server, we can disable PDF/A-1b
            // to drastically speed up conversion while relying on standard PDF generation.
            // content.Add(new StringContent("PDF/A-1b"), "pdfFormat");

            if (!options.UseOriginalDocumentSettings)
            {
                // Add orientation if specified
                if (!string.IsNullOrEmpty(options.Orientation))
                {
                    content.Add(new StringContent(options.Orientation == "landscape" ? "true" : "false"), "landscape");
                }

                // Add margins if specified
                if (options.MarginTop.HasValue)
                {
                    content.Add(new StringContent(options.MarginTop.Value.ToString()), "marginTop");
                }
                if (options.MarginBottom.HasValue)
                {
                    content.Add(new StringContent(options.MarginBottom.Value.ToString()), "marginBottom");
                }
                if (options.MarginLeft.HasValue)
                {
                    content.Add(new StringContent(options.MarginLeft.Value.ToString()), "marginLeft");
                }
                if (options.MarginRight.HasValue)
                {
                    content.Add(new StringContent(options.MarginRight.Value.ToString()), "marginRight");
                }

                // Set paper size if specified
                if (!string.IsNullOrEmpty(options.PaperSize))
                {
                    if (options.PaperSize == "A4")
                    {
                        content.Add(new StringContent("8.27"), "paperWidth");
                        content.Add(new StringContent("11.69"), "paperHeight");
                    }
                    else if (options.PaperSize == "Letter")
                    {
                        content.Add(new StringContent("8.5"), "paperWidth");
                        content.Add(new StringContent("11"), "paperHeight");
                    }
                }
            }

            var response = await _httpClient.PostAsync(ConvertEndpoint, content, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Gotenberg conversion failed with status {StatusCode}: {Error}",
                    response.StatusCode, errorContent);
                throw new InvalidOperationException($"PDF conversion failed: {response.StatusCode} - {errorContent}");
            }

            var pdfBytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            _logger.LogInformation("Successfully converted DOCX to PDF, size: {Size} bytes", pdfBytes.Length);

            return pdfBytes;
        }
        catch (TaskCanceledException)
        {
            _logger.LogError("PDF conversion timed out after {Timeout} seconds", _settings.TimeoutSeconds);
            throw new TimeoutException($"PDF conversion timed out after {_settings.TimeoutSeconds} seconds");
        }
        catch (Exception ex) when (ex is not InvalidOperationException && ex is not TimeoutException)
        {
            _logger.LogError(ex, "Failed to convert DOCX to PDF");
            throw;
        }
    }
}

