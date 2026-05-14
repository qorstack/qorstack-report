using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Analytics.Models;

namespace QorstackReportService.Application.Analytics.Queries.GetGenerations;

public record GetGenerationsQuery(
    Guid? ProjectId = null,
    string? TemplateKey = null,
    string? Status = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    int PageNumber = 1,
    int PageSize = 15,
    string SortBy = "createdDatetime",
    string SortDirection = "desc") : IRequest<PaginatedList<GenerationDto>>;

public class GetGenerationsQueryHandler : IRequestHandler<GetGenerationsQuery, PaginatedList<GenerationDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;
    private readonly IMinioStorageService _storageService;
    private readonly IConfiguration _configuration;

    public GetGenerationsQueryHandler(
        IApplicationDbContext context,
        IUser currentUser,
        IMinioStorageService storageService,
        IConfiguration configuration)
    {
        _context = context;
        _currentUser = currentUser;
        _storageService = storageService;
        _configuration = configuration;
    }

    public async Task<PaginatedList<GenerationDto>> Handle(GetGenerationsQuery request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null)
            return new PaginatedList<GenerationDto>(Array.Empty<GenerationDto>(), 0, request.PageNumber, request.PageSize);

        var userId = Guid.Parse(userIdStr);

        var query = _context.ReportJobs
            .Include(j => j.TemplateVersion)
                .ThenInclude(v => v!.Template)
                    .ThenInclude(t => t!.Project)
            .Where(j => j.UserId == userId)
            .AsQueryable();

        // Filter by project
        if (request.ProjectId.HasValue)
        {
            query = query.Where(j =>
                j.TemplateVersion != null &&
                j.TemplateVersion.Template != null &&
                j.TemplateVersion.Template.ProjectId == request.ProjectId.Value);
        }

        // Filter by template key
        if (!string.IsNullOrEmpty(request.TemplateKey))
        {
            query = query.Where(j =>
                j.TemplateVersion != null &&
                j.TemplateVersion.Template != null &&
                j.TemplateVersion.Template.TemplateKey == request.TemplateKey);
        }

        // Filter by status
        if (!string.IsNullOrEmpty(request.Status))
        {
            query = query.Where(j => j.Status == request.Status.ToLowerInvariant());
        }

        // Filter by date range
        if (request.FromDate.HasValue)
        {
            query = query.Where(j => j.CreatedDatetime >= request.FromDate.Value);
        }
        if (request.ToDate.HasValue)
        {
            query = query.Where(j => j.CreatedDatetime <= request.ToDate.Value);
        }

        // Sort
        var isDesc = request.SortDirection?.ToLowerInvariant() == "desc";
        query = request.SortBy?.ToLowerInvariant() switch
        {
            "durationms" => isDesc ? query.OrderByDescending(j => j.DurationMs) : query.OrderBy(j => j.DurationMs),
            "status" => isDesc ? query.OrderByDescending(j => j.Status) : query.OrderBy(j => j.Status),
            "templatename" => isDesc
                ? query.OrderByDescending(j => j.TemplateVersion!.Template!.Name)
                : query.OrderBy(j => j.TemplateVersion!.Template!.Name),
            _ => isDesc ? query.OrderByDescending(j => j.CreatedDatetime) : query.OrderBy(j => j.CreatedDatetime)
        };

        // Paginate
        var count = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var bucketName = _configuration["Minio:ReportBucket"] ?? "reports";

        var tasks = items.Select(async j =>
        {
            var templateName = j.TemplateVersion?.Template?.Name ?? "Unknown";
            var templateKey = j.TemplateVersion?.Template?.TemplateKey;
            var filePath = j.TemplateVersion?.FilePath ?? "";
            var type = filePath.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) ||
                       filePath.EndsWith(".xls", StringComparison.OrdinalIgnoreCase)
                ? "Excel" : "PDF";

            // Build download URL from output file path
            string? downloadUrl = null;
            if (!string.IsNullOrEmpty(j.OutputFilePath) && j.Status?.ToLowerInvariant() != "failed")
            {
                try
                {
                    downloadUrl = await _storageService.GetPresignedUrlAsync(bucketName, j.OutputFilePath);
                }
                catch
                {
                    // If generation fails (e.g. object not found), we return null for downloadUrl
                    downloadUrl = null;
                }
            }

            return new GenerationDto(
                j.Id,
                templateName,
                templateKey,
                type,
                j.Status ?? "unknown",
                j.CreatedDatetime,
                j.DurationMs,
                j.FileSizeBytes,
                j.ErrorMessage,
                downloadUrl);
        });

        var dtos = await Task.WhenAll(tasks);

        return new PaginatedList<GenerationDto>(dtos.ToList(), count, request.PageNumber, request.PageSize);
    }
}
