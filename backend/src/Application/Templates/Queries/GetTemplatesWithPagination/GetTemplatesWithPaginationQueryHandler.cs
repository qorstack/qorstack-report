using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Templates.Models;

namespace QorstackReportService.Application.Templates.Queries.GetTemplatesWithPagination;

/// <summary>
/// Handler for GetTemplatesWithPaginationQuery
/// </summary>
public class GetTemplatesWithPaginationQueryHandler : IRequestHandler<GetTemplatesWithPaginationQuery, PaginatedList<TemplateResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storageService;
    private readonly IConfiguration _configuration;

    public GetTemplatesWithPaginationQueryHandler(
        IApplicationDbContext context,
        IMinioStorageService storageService,
        IConfiguration configuration)
    {
        _context = context;
        _storageService = storageService;
        _configuration = configuration;
    }

    public async Task<PaginatedList<TemplateResponse>> Handle(GetTemplatesWithPaginationQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Templates
            .Include(t => t.TemplateVersions)
            .Where(t => t.UserId == request.UserId);

        // Apply filters
        if (!string.IsNullOrWhiteSpace(request.SearchName))
        {
            query = query.Where(t => t.Name.Contains(request.SearchName) || t.TemplateKey.Contains(request.SearchName));
        }

        if (request.ProjectId.HasValue)
        {
            query = query.Where(t => t.ProjectId == request.ProjectId.Value);
        }

        // Order by created date descending
        query = query.OrderByDescending(t => t.CreatedDatetime);

        // Get total count
        var totalCount = await query.CountAsync(cancellationToken);

        // Apply pagination and projection
        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(t => new TemplateResponse
            {
                Id = t.Id,
                UserId = t.UserId,
                TemplateKey = t.TemplateKey,
                Name = t.Name,
                ProjectId = t.ProjectId,
                ActiveVersion = t.TemplateVersions
                    .Where(v => v.Status == "active")
                    .OrderByDescending(v => v.Version)
                    .Select(v => new TemplateVersionResponse
                    {
                        Id = v.Id,
                        TemplateId = v.TemplateId,
                        Version = v.Version,
                        FilePath = v.FilePath,
                        PreviewFilePath = v.PreviewFilePath,
                        Status = v.Status,
                        CreatedBy = v.CreatedBy,
                        CreatedDatetime = v.CreatedDatetime
                    })
                    .FirstOrDefault(),
                AllVersions = t.TemplateVersions
                    .OrderByDescending(v => v.Version)
                    .Select(v => new TemplateVersionResponse
                    {
                        Id = v.Id,
                        TemplateId = v.TemplateId,
                        Version = v.Version,
                        FilePath = v.FilePath,
                        PreviewFilePath = v.PreviewFilePath,
                        Status = v.Status,
                        CreatedBy = v.CreatedBy,
                        CreatedDatetime = v.CreatedDatetime
                    })
                    .ToList(),
                CreatedBy = t.CreatedBy,
                CreatedDatetime = t.CreatedDatetime,
                UpdatedBy = t.UpdatedBy,
                UpdatedDatetime = t.UpdatedDatetime
            })
            .ToListAsync(cancellationToken);

        // Get presigned URLs for active versions with preview files
        var templateBucket = _configuration["Minio:TemplateBucket"] ?? "templates";
        foreach (var item in items)
        {
            if (item.ActiveVersion != null && !string.IsNullOrEmpty(item.ActiveVersion.PreviewFilePath))
            {
                try
                {
                    item.ActiveVersion.PreviewFilePathPresigned = await _storageService.GetPresignedUrlAsync(
                        templateBucket,
                        item.ActiveVersion.PreviewFilePath,
                        3600); // 1 hour expiry
                }
                catch
                {
                    // Ignore errors getting presigned URL
                }
            }
        }

        return new PaginatedList<TemplateResponse>(items, totalCount, request.PageNumber, request.PageSize);
    }
}
