using Microsoft.Extensions.Configuration;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Reports.Queries.GetReportJobById;

public class GetReportJobByIdQueryHandler : IRequestHandler<GetReportJobByIdQuery, ReportJobDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storageService;
    private readonly string _reportBucket;
    private readonly int _urlExpirySeconds;

    public GetReportJobByIdQueryHandler(
        IApplicationDbContext context,
        IMinioStorageService storageService,
        IConfiguration configuration)
    {
        _context = context;
        _storageService = storageService;
        _reportBucket = StorageAreas.Reports;
        _urlExpirySeconds = int.Parse(configuration["QorstackReport:TempFileExpiryMinutes"] ?? "60") * 60;
    }

    public async Task<ReportJobDto> Handle(GetReportJobByIdQuery request, CancellationToken cancellationToken)
    {
        var job = await _context.ReportJobs
            .Where(r => r.Id == request.Id && r.UserId == request.UserId)
            .Select(r => new ReportJobDto
            {
                Id = r.Id,
                UserId = r.UserId,
                ApiKeyId = r.ApiKeyId,
                SourceType = r.SourceType,
                TemplateVersionId = r.TemplateVersionId,
                Status = r.Status,
                RequestData = r.RequestData,
                ErrorMessage = r.ErrorMessage,
                OutputFilePath = r.OutputFilePath,
                StartedAt = r.StartedAt,
                FinishedAt = r.FinishedAt,
                DurationMs = r.DurationMs,
                FileSizeBytes = r.FileSizeBytes,
                CreatedBy = r.CreatedBy,
                CreatedDatetime = r.CreatedDatetime,
                UpdatedBy = r.UpdatedBy,
                UpdatedDatetime = r.UpdatedDatetime
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (job == null)
            throw new NotFoundException("ReportJob", request.Id);

        if (!string.IsNullOrEmpty(job.OutputFilePath) && job.Status == "success")
        {
            try
            {
                var fileExists = await _storageService.FileExistsAsync(_reportBucket, job.OutputFilePath);
                if (fileExists)
                {
                    job.DownloadUrl = await _storageService.GetPresignedUrlAsync(
                        _reportBucket, job.OutputFilePath, _urlExpirySeconds);
                    job.DownloadUrlExpiresAt = DateTime.UtcNow.AddSeconds(_urlExpirySeconds);
                }
            }
            catch
            {
                // Presigned URL generation is best-effort; don't fail the request
            }
        }

        return job;
    }
}
