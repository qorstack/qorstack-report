using System.Diagnostics;
using System.IO.Compression;
using System.Text.Json;
using QorstackReportService.Application.Common.Helpers;
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
    private readonly ISandboxAssetService _assetService;
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
        ISandboxAssetService assetService,
        IUser user,
        ILogger<ExportExcelCommandHandler> logger,
        IConfiguration configuration)
    {
        _context = context;
        _storageService = storageService;
        _excelService = excelService;
        _gotenbergService = gotenbergService;
        _assetService = assetService;
        _user = user;
        _logger = logger;
        _templateBucket = StorageAreas.Templates;
        _reportBucket = StorageAreas.Reports;
        _urlExpirySeconds = int.Parse(configuration["QorstackReport:TempFileExpiryMinutes"] ?? "60") * 60;
    }

    public async Task<RenderResult> Handle(ExportExcelCommand request, CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        var jobId = request.JobId ?? Guid.NewGuid();

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

            var template = await _context.Templates
                .Include(t => t.TemplateVersions.Where(tv => request.TemplateVersion == null ? tv.Status == "active" : tv.Version == request.TemplateVersion))
                .Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.TemplateKey == request.TemplateKey && t.UserId == request.UserId, cancellationToken);

            if (template == null)
                throw new KeyNotFoundException($"Template {request.TemplateKey} not found.");

            // "activeVersion" is the version being rendered: the requested one, or the current (active) one.
            var activeVersion = request.TemplateVersion == null
                ? template.TemplateVersions.FirstOrDefault(tv => tv.Status == "active")
                : template.TemplateVersions.FirstOrDefault(tv => tv.Version == request.TemplateVersion);
            if (activeVersion == null)
            {
                if (request.TemplateVersion != null)
                    throw new KeyNotFoundException($"Template '{request.TemplateKey}' has no version {request.TemplateVersion}.");
                throw new InvalidOperationException("No active template version found");
            }

            bool logEnabled = template.Project?.LogEnabled ?? true;

            string serializedData = JsonSerializer.Serialize(request.Data ?? new DocumentProcessingData());

            // Image URLs that point at our own MinIO (presigned, from the builder) → minio: paths, read from
            // storage instead of over HTTP (the URL fetcher refuses internal hosts). Then allow only this
            // template's own builder assets — never files of other templates, projects or tenants.
            _assetService.ConvertPresignedUrlsToMinioPaths(request.Data ??= new DocumentProcessingData());
            _assetService.EnsureOwnStoragePaths(request.Data, template.Id);

            ReportJob? reportJob = null;
            if (request.JobId != null)
            {
                // Async render: the job row was created (pending) when the request was queued and is always kept.
                reportJob = await _context.ReportJobs.FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken)
                    ?? throw new KeyNotFoundException($"Report job {jobId} not found.");
                reportJob.Status = ReportJobStatus.Processing.ToString().ToLowerInvariant();
                reportJob.TemplateVersionId = activeVersion.Id;
                reportJob.RequestData = serializedData;
                reportJob.StartedAt = DateTime.UtcNow;
                reportJob.UpdatedDatetime = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }
            else if (logEnabled)
            {
                reportJob = new ReportJob
                {
                    Id = jobId,
                    UserId = request.UserId,
                    SourceType = "template-excel",
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
            }

            using var templateStream = await _storageService.DownloadFileAsync(_templateBucket, activeVersion.FilePath);

            var data = request.Data ?? new DocumentProcessingData();

            if (request.IsSandbox)
            {
                // Normalize presigned URLs → minio: paths, then upload any base64 → MinIO
                _assetService.ConvertPresignedUrlsToMinioPaths(data);
                var assetPrefix = $"sandbox-assets/{request.UserId}/{template.Id}";
                await _assetService.ReplaceBase64WithMinioUrlsAsync(data, assetPrefix);

                // Persist the cleaned payload (base64 → minio:, expired-URL → minio:)
                var serOpts = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = false };
                activeVersion.SandboxPayload = JsonSerializer.Serialize(data, serOpts);
            }

            Stream processedStream = await _excelService.ProcessTemplateAsync(
                templateStream, data, cancellationToken);

            using var ms = new MemoryStream();
            await processedStream.CopyToAsync(ms, cancellationToken);
            await processedStream.DisposeAsync();

            var outputBytes = ms.ToArray();
            var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            var fileExtension = ".xlsx";
            var fileType = "xlsx";

            if (request.ZipOutput)
            {
                outputBytes = WrapInZip(outputBytes, $"{jobId}{fileExtension}");
                contentType = "application/zip";
                fileExtension = ".zip";
                fileType = "zip";
            }

            stopwatch.Stop();

            var outputPath = request.IsSandbox
                ? $"sandbox/{request.UserId}/{template.Id}/v{activeVersion.Version}{fileExtension}"
                : $"report-logs/{request.UserId}/{jobId}{fileExtension}";

            if (reportJob != null)
            {
                reportJob.Status = ReportJobStatus.Success.ToString().ToLowerInvariant();
                reportJob.FinishedAt = DateTime.UtcNow;
                reportJob.DurationMs = stopwatch.ElapsedMilliseconds;
                reportJob.FileSizeBytes = outputBytes.Length;
                reportJob.OutputFilePath = outputPath;
                await _context.SaveChangesAsync(cancellationToken);
            }

            _logger.LogInformation("Completed Excel export job {JobId} in {Duration}ms. Size: {Size} bytes",
                jobId, stopwatch.ElapsedMilliseconds, outputBytes.Length);

            using var outputStream = new MemoryStream(outputBytes);
            await _storageService.UploadFileAsync(_reportBucket, outputPath, outputStream, contentType);

            if (request.IsSandbox)
            {
                activeVersion.SandboxFilePath = outputPath;
                activeVersion.UpdatedBy = _user.Id;
                activeVersion.UpdatedDatetime = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }

            string? downloadFileName = null;
            if (!string.IsNullOrWhiteSpace(request.FileName))
            {
                var baseName = Path.GetFileNameWithoutExtension(request.FileName.Trim());
                if (!string.IsNullOrWhiteSpace(baseName)) downloadFileName = $"{baseName}{fileExtension}";
            }
            var downloadUrl = await _storageService.GetPresignedUrlAsync(_reportBucket, outputPath, _urlExpirySeconds, downloadFileName);

            // Generate per-sheet PDF previews for sandbox (xlsx only — skip if zipped)
            string? pdfPreviewUrl = null;
            Dictionary<string, int>? sheetPageMap = null;
            Dictionary<string, string>? sheetPdfUrlMap = null;
            if (request.IsSandbox && request.SandboxGeneratePdfPreview && !request.ZipOutput)
            {
                try
                {
                    using var xlsxForSheets = new MemoryStream(outputBytes);
                    var allSheets = ExcelGridlineHelper.GetSheetPageMap(xlsxForSheets);

                    if (allSheets.Count <= 1)
                    {
                        // Single-sheet: one PDF (simpler, faster)
                        using var xlsxForPdf = new MemoryStream(outputBytes);
                        using var withGridlines = ExcelGridlineHelper.AddGridlineBorders(xlsxForPdf);
                        var pdfBytes = await _gotenbergService.ConvertDocxToPdfAsync(withGridlines, cancellationToken);
                        var pdfPath = $"sandbox/{request.UserId}/{template.Id}/v{activeVersion.Version}_result_preview.pdf";
                        using var pdfStream = new MemoryStream(pdfBytes);
                        await _storageService.UploadFileAsync(_reportBucket, pdfPath, pdfStream, "application/pdf");
                        pdfPreviewUrl = await _storageService.GetPresignedUrlAsync(_reportBucket, pdfPath, _urlExpirySeconds);
                        activeVersion.SandboxPdfPreviewFilePath = System.Text.Json.JsonSerializer.Serialize(
                            allSheets.Count == 1
                                ? new Dictionary<string, string> { [allSheets.Keys.First()] = pdfPath }
                                : new Dictionary<string, string> { ["default"] = pdfPath });
                    }
                    else
                    {
                        // Multi-sheet: one PDF per sheet for accurate page boundaries
                        var pathMap = new Dictionary<string, string>();
                        var urlMap = new Dictionary<string, string>();
                        foreach (var sheetName in allSheets.Keys)
                        {
                            try
                            {
                                using var xlsxForSheet = new MemoryStream(outputBytes);
                                using var singleSheetXlsx = await _excelService.ExtractSingleSheetAsync(xlsxForSheet, sheetName, cancellationToken);
                                using var withGridlines = ExcelGridlineHelper.AddGridlineBorders(singleSheetXlsx);
                                var pdfBytes = await _gotenbergService.ConvertDocxToPdfAsync(withGridlines, cancellationToken);
                                var safeName = string.Concat(sheetName.Where(c => char.IsLetterOrDigit(c) || c == '_'));
                                var pdfPath = $"sandbox/{request.UserId}/{template.Id}/v{activeVersion.Version}_sheet_{safeName}_preview.pdf";
                                using var pdfStream = new MemoryStream(pdfBytes);
                                await _storageService.UploadFileAsync(_reportBucket, pdfPath, pdfStream, "application/pdf");
                                pathMap[sheetName] = pdfPath;
                                urlMap[sheetName] = await _storageService.GetPresignedUrlAsync(_reportBucket, pdfPath, _urlExpirySeconds);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, "Failed to generate PDF for sheet {SheetName} in job {JobId}", sheetName, jobId);
                            }
                        }
                        sheetPdfUrlMap = urlMap.Count > 0 ? urlMap : null;
                        activeVersion.SandboxPdfPreviewFilePath = System.Text.Json.JsonSerializer.Serialize(pathMap);
                    }

                    activeVersion.UpdatedBy = _user.Id;
                    activeVersion.UpdatedDatetime = DateTime.UtcNow;
                    await _context.SaveChangesAsync(cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to generate PDF preview for sandbox Excel job {JobId}", jobId);
                }
            }

            if (tx != null)
                await tx.CommitAsync(cancellationToken);

            return new RenderResult
            {
                JobId = jobId,
                Status = "success",
                DownloadUrl = downloadUrl,
                ExpiresIn = _urlExpirySeconds,
                FileType = fileType,
                IsZipped = request.ZipOutput,
                PdfPreviewUrl = pdfPreviewUrl,
                SheetPageMap = sheetPageMap,
                SheetPdfUrlMap = sheetPdfUrlMap
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
