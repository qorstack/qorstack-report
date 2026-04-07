using System.Diagnostics;
using System.IO.Compression;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Reports.Models;
using QorstackReportService.Domain.Entities;
using QorstackReportService.Domain.Enums;

namespace QorstackReportService.Application.Reports.Commands.ExportPdf;

public class ExportPdfCommandHandler : IRequestHandler<ExportPdfCommand, RenderResult>
{
    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storageService;
    private readonly IDocxProcessingService _docxService;
    private readonly IGotenbergService _gotenbergService;
    private readonly IPdfPostProcessingService _pdfPostProcessingService;
    private readonly IReportJobQuotaService _quotaService;
    private readonly IUser _user;
    private readonly ILogger<ExportPdfCommandHandler> _logger;
    private readonly string _templateBucket;
    private readonly string _reportBucket;
    private readonly int _urlExpirySeconds;

    public ExportPdfCommandHandler(
        IApplicationDbContext context,
        IMinioStorageService storageService,
        IDocxProcessingService docxService,
        IGotenbergService gotenbergService,
        IPdfPostProcessingService pdfPostProcessingService,
        IReportJobQuotaService quotaService,
        IUser user,
        ILogger<ExportPdfCommandHandler> logger,
        IConfiguration configuration)
    {
        _context = context;
        _storageService = storageService;
        _docxService = docxService;
        _gotenbergService = gotenbergService;
        _pdfPostProcessingService = pdfPostProcessingService;
        _quotaService = quotaService;
        _user = user;
        _logger = logger;
        _templateBucket = configuration["Minio:TemplateBucket"] ?? "templates";
        _reportBucket = configuration["Minio:ReportBucket"] ?? "reports";
        _urlExpirySeconds = int.Parse(configuration["QorstackReport:TempFileExpiryMinutes"] ?? "60") * 60;
    }

    public async Task<RenderResult> Handle(ExportPdfCommand request, CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        var jobId = Guid.NewGuid();

        var hasExistingTransaction = _context.Database.CurrentTransaction != null;
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? tx = null;

        if (!hasExistingTransaction)
            tx = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            _logger.LogInformation("Starting PDF export job {JobId} for template key {TemplateKey}, user {UserId}",
                jobId, request.TemplateKey, request.UserId);

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

            if (user == null)
                throw new KeyNotFoundException($"User {request.UserId} not found.");

            // Authorize and charge quota (OSS: always free; SaaS: subscription/credit logic)
            var chargedType = await _quotaService.AuthorizeAndChargeAsync(request.UserId, jobId, cancellationToken);
            if (chargedType == null)
                throw new QuotaExceededException("No available quota. Please purchase a subscription or add credits.");

            var template = await _context.Templates
                .Include(t => t.TemplateVersions.Where(tv => tv.Status == "active"))
                .FirstOrDefaultAsync(t => t.TemplateKey == request.TemplateKey && t.UserId == request.UserId, cancellationToken);

            if (template == null)
                throw new KeyNotFoundException($"Template {request.TemplateKey} not found.");

            var activeVersion = template.TemplateVersions.FirstOrDefault(tv => tv.Status == "active");
            if (activeVersion == null)
                throw new InvalidOperationException("No active template version found");

#nullable disable
            DocumentProcessingData dataToSerialize = request.Data ?? new DocumentProcessingData();
            string serializedData = request.IsSandbox
                ? JsonSerializer.Serialize(dataToSerialize)
                : JsonSerializer.Serialize(SanitizeBase64ForLogging(dataToSerialize));
#nullable restore

            var reportJob = new ReportJob
            {
                Id = jobId,
                UserId = request.UserId,
                SourceType = "template",
                TemplateVersionId = activeVersion.Id,
                Status = ReportJobStatus.Processing.ToString().ToLowerInvariant(),
                RequestData = serializedData,
                CreatedBy = _user!.Id ?? "unknown",
                CreatedDatetime = DateTime.UtcNow,
                UpdatedBy = _user!.Id ?? "unknown",
                UpdatedDatetime = DateTime.UtcNow
            };

            _context.ReportJobs.Add(reportJob);
            await _context.SaveChangesAsync(cancellationToken);

            using var templateStream = await _storageService.DownloadFileAsync(_templateBucket, activeVersion.FilePath);

            var docxStream = await _docxService.ProcessTemplateAsync(
                templateStream, request.Data ?? new DocumentProcessingData(), cancellationToken);

            byte[] outputBytes;
            string contentType;
            string fileExtension;
            var fileType = request.FileType.ToLowerInvariant();

            if (fileType == "docx")
            {
                using var ms = new MemoryStream();
                await docxStream.CopyToAsync(ms, cancellationToken);
                if (docxStream != templateStream) await docxStream.DisposeAsync();
                outputBytes = ms.ToArray();
                contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                fileExtension = ".docx";
            }
            else // default: pdf
            {
                var pdfBytes = await _gotenbergService.ConvertDocxToPdfAsync(docxStream, cancellationToken);
                if (docxStream != templateStream) await docxStream.DisposeAsync();
                pdfBytes = await _pdfPostProcessingService.ProcessAsync(
                    pdfBytes, request.PdfPassword, request.Watermark, cancellationToken);
                outputBytes = pdfBytes;
                contentType = "application/pdf";
                fileExtension = ".pdf";
                fileType = "pdf";
            }

            if (request.ZipOutput)
            {
                outputBytes = WrapInZip(outputBytes, $"{jobId}{fileExtension}");
                contentType = "application/zip";
                fileExtension = ".zip";
                fileType = "zip";
            }

            stopwatch.Stop();

            reportJob.Status = ReportJobStatus.Success.ToString().ToLowerInvariant();
            reportJob.FinishedAt = DateTime.UtcNow;
            reportJob.DurationMs = stopwatch.ElapsedMilliseconds;
            reportJob.FileSizeBytes = outputBytes.Length;
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Completed PDF export job {JobId} in {Duration}ms. Size: {Size} bytes",
                jobId, stopwatch.ElapsedMilliseconds, reportJob.FileSizeBytes);

            var outputPath = request.IsSandbox
                ? $"sandbox/{request.UserId}/{template.Id}/v{activeVersion.Version}{fileExtension}"
                : $"temp-download/{request.UserId}/{jobId}{fileExtension}";

            using var outputStream = new MemoryStream(outputBytes);
            await _storageService.UploadFileAsync(_reportBucket, outputPath, outputStream, contentType);

            if (request.IsSandbox)
            {
                activeVersion.SandboxFilePath = outputPath;
                activeVersion.UpdatedBy = _user.Id;
                activeVersion.UpdatedDatetime = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }

            var downloadUrl = await _storageService.GetPresignedUrlAsync(_reportBucket, outputPath, _urlExpirySeconds);

            if (tx != null)
                await tx.CommitAsync(cancellationToken);

            return new RenderResult
            {
                JobId = jobId,
                Status = "success",
                DownloadUrl = downloadUrl,
                ExpiresIn = _urlExpirySeconds,
                FileType = fileType,
                IsZipped = request.ZipOutput
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            if (tx != null)
                await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception($"Failed PDF export job {jobId}"), _logger);
        }
    }

    private static byte[] WrapInZip(byte[] fileBytes, string entryName)
    {
        using var zipStream = new MemoryStream();
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            var entry = archive.CreateEntry(entryName);
            using var entryStream = entry.Open();
            entryStream.Write(fileBytes);
        }
        return zipStream.ToArray();
    }

    private static DocumentProcessingData SanitizeBase64ForLogging(DocumentProcessingData data)
    {
        return new DocumentProcessingData
        {
            Replace = data.Replace,
            Table = data.Table,
            Barcode = data.Barcode,
            Image = data.Image.ToDictionary(kvp => kvp.Key, kvp => SanitizeImageData(kvp.Value)),
            Qrcode = data.Qrcode.ToDictionary(kvp => kvp.Key, kvp => SanitizeQrCodeData(kvp.Value))
        };
    }

    private static ImageData? SanitizeImageData(ImageData? value)
    {
        if (value == null) return null;
        return new ImageData
        {
            Src = IsBase64(value.Src) ? "[base64]" : value.Src,
            Width = value.Width,
            Height = value.Height,
            ObjectFit = value.ObjectFit
        };
    }

    private static QrCodeData? SanitizeQrCodeData(QrCodeData? value)
    {
        if (value == null) return null;
        return new QrCodeData
        {
            Text = value.Text,
            Size = value.Size,
            Logo = IsBase64(value.Logo) ? "[base64]" : value.Logo,
            Color = value.Color,
            BackgroundColor = value.BackgroundColor
        };
    }

    private static bool IsBase64(string? value)
    {
        if (string.IsNullOrEmpty(value)) return false;
        if (value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            value.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) return false;
        return value.StartsWith("data:", StringComparison.OrdinalIgnoreCase) || value.Length > 200;
    }
}
