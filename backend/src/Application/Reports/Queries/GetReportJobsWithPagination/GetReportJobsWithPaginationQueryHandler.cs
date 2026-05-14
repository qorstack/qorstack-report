using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Reports.Queries.GetReportJobsWithPagination;

/// <summary>
/// Handler for GetReportJobsWithPaginationQuery
/// </summary>
public class GetReportJobsWithPaginationQueryHandler : IRequestHandler<GetReportJobsWithPaginationQuery, PaginatedList<ReportJobDto>>
{
    private readonly IApplicationDbContext _context;

    public GetReportJobsWithPaginationQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<ReportJobDto>> Handle(GetReportJobsWithPaginationQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ReportJobs
            .Include(r => r.TemplateVersion!)
            .ThenInclude(tv => tv.Template!)
            .Where(r => r.UserId == request.UserId);

        // Apply filters
        if (!string.IsNullOrEmpty(request.TemplateKey))
        {
            query = query.Where(r => r.TemplateVersion != null && r.TemplateVersion.Template != null && r.TemplateVersion.Template.TemplateKey == request.TemplateKey);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(r => r.Status == request.Status.ToLowerInvariant());
        }

        if (request.FromDate.HasValue)
        {
            query = query.Where(r => r.CreatedDatetime >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            query = query.Where(r => r.CreatedDatetime <= request.ToDate.Value);
        }

        // Order by created date descending
        query = query.OrderByDescending(r => r.CreatedDatetime);

        // Get total count
        var totalCount = await query.CountAsync(cancellationToken);

        // Apply pagination and projection
        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(r => new ReportJobDto
            {
                Id = r.Id,
                UserId = r.UserId,
                SourceType = r.SourceType,
                TemplateVersionId = r.TemplateVersionId,
                Status = r.Status,
                RequestData = r.RequestData,
                ErrorMessage = r.ErrorMessage,
                OutputFilePath = r.OutputFilePath,
                StartedAt = r.StartedAt,
                FinishedAt = r.FinishedAt,
                DurationMs = r.DurationMs,
                CreatedBy = r.CreatedBy,
                CreatedDatetime = r.CreatedDatetime,
                UpdatedBy = r.UpdatedBy,
                UpdatedDatetime = r.UpdatedDatetime
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<ReportJobDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}
