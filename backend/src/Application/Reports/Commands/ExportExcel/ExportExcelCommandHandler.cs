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

namespace QorstackReportService.Application.Reports.Commands.ExportExcel;

public class ExportExcelCommandHandler : IRequestHandler<ExportExcelCommand, RenderResult>
{
    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storageService;
    private readonly IExcelProcessingService _excelService;
    private readonly IGotenbergService _gotenbergService;
    private readonly IPdfPostProcessingService _pdfPostProcessingService;
    private readonly IUser _user;
    private readonly ILogger<ExportExcelCommandHandler> _logger;
    private readonly string _templateBucket;
    private readonly string _reportBucket;
    private readonly int _urlExpirySeconds;

    public ExportExcelCommandHandler(
        IApplicationDbContext context,
        IMinioStorageService storageService,
        IExcelProcessingService excelService,
        IGotenbergService gotenbergService,
        IPdfPostProcessingService pdfPostProcessingService,
        IUser user,
        ILogger<ExportExcelCommandHandler> logger,
        IConfiguration configuration)
    {
        _context = context;
        _storageService = storageService;
        _excelService = excelService;
        _gotenbergService = gotenbergService;
        _pdfPostProcessingService = pdfPostProcessingService;
        _user = user;
        _logger = logger;
        _templateBucket = configuration["Minio:TemplateBucket"] ?? "templates";
        _reportBucket = configuration["Minio:ReportBucket"] ?? "reports";
        _urlExpirySeconds = int.Parse(configuration["QorstackReport:TempFileExpiryMinutes"] ?? "60") * 60;
    }

    public async Task<RenderResult> Handle(ExportExcelCommand request, CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        var jobId = Guid.NewGuid();

        var hasExistingTransaction = _context.Database.CurrentTransaction != null;
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? tx = null;

        if (!hasExistingTransaction)
            tx = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            _logger.LogInformation("Starting Excel export job {JobId} for template key {TemplateKey}, user {UserId}",
                jobId, request.TemplateKey, request.UserId);

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

            if (user == null)
                throw new KeyNotFoundException($"User {request.UserId} not found.");

            string? chargedType = "BETA";

            var template = await _context.Templates
                .Include(t => t.TemplateVersions.Where(tv => tv.Status == "active"))
                .FirstOrDefaultAsync(t => t.TemplateKey == request.TemplateKey && t.UserId == request.UserId, cancellationToken);

            if (template == null)
                throw new KeyNotFoundException($"Template {request.TemplateKey} not found.");

            var activeVersion = template.TemplateVersions.FirstOrDefault(tv => tv.Status == "active");
            if (activeVersion == null)
                throw new InvalidOperationException("No active template version found");

            string serializedData = JsonSerializer.Serialize(request.Data ?? new DocumentProcessingData());

            var reportJob = new ReportJob
            {
                Id = jobId,
                UserId = request.UserId,
                SourceType = "template-excel",
                TemplateVersionId = activeVersion.Id,
                Status = ReportJobStatus.Processing.ToString().ToLowerInvariant(),
                RequestData = serializedData,
                ChargedType = chargedType,
                CreatedBy = _user!.Id ?? "unknown",
                CreatedDatetime = DateTime.UtcNow,
                UpdatedBy = _user!.Id ?? "unknown",
                UpdatedDatetime = DateTime.UtcNow
            };

            _context.ReportJobs.Add(reportJob);
            await _context.SaveChangesAsync(cancellationToken);

            using var templateStream = await _storageService.DownloadFileAsync(_templateBucket, activeVersion.FilePath);

            Stream processedStream = await _excelService.ProcessTemplateAsync(
                templateStream, request.Data ?? new DocumentProcessingData(), cancellationToken);

            byte[] outputBytes;
            string contentType;
            string fileExtension;
            var fileType = request.FileType.ToLowerInvariant();

            if (fileType == "pdf")
            {
                var pdfBytes = await _gotenbergService.ConvertDocxToPdfAsync(processedStream, cancellationToken);
                await processedStream.DisposeAsync();

                pdfBytes = await _pdfPostProcessingService.ProcessAsync(
                    pdfBytes, request.PdfPassword, request.Watermark, cancellationToken);

                outputBytes = pdfBytes;
                contentType = "application/pdf";
                fileExtension = ".pdf";
            }
            else // default: xlsx
            {
                using var ms = new MemoryStream();
                await processedStream.CopyToAsync(ms, cancellationToken);
                await processedStream.DisposeAsync();

                outputBytes = ms.ToArray();
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                fileExtension = ".xlsx";
                fileType = "xlsx";
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

            _logger.LogInformation("Completed Excel export job {JobId} in {Duration}ms. Size: {Size} bytes",
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
            throw new ThrowException(ex, new Exception($"Failed Excel export job {jobId}"), _logger);
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
}
