using QorstackReportService.Application.Common.Mappings;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.ReportJobs.Queries.GetReportJobs;

/// <summary>
/// Query to get report jobs for a user
/// </summary>
public class GetReportJobsQuery : IRequest<PaginatedList<ReportJobDto>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

/// <summary>
/// Handler for GetReportJobsQuery
/// </summary>
public class GetReportJobsQueryHandler : IRequestHandler<GetReportJobsQuery, PaginatedList<ReportJobDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public GetReportJobsQueryHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task<PaginatedList<ReportJobDto>> Handle(GetReportJobsQuery request, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(_user.Id ?? throw new InvalidOperationException("User ID is required"));
        var query = _context.ReportJobs
            .Where(rj => rj.UserId == userId)
            .OrderByDescending(rj => rj.CreatedDatetime);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(rj => new ReportJobDto
            {
                Id = rj.Id,
                UserId = rj.UserId,
                ApiKeyId = rj.ApiKeyId,
                SubscriptionId = rj.SubscriptionId,
                SourceType = rj.SourceType,
                TemplateVersionId = rj.TemplateVersionId,
                ChargedType = rj.ChargedType,
                Status = rj.Status,
                RequestData = rj.RequestData,
                OutputFilePath = rj.OutputFilePath,
                CreatedBy = rj.CreatedBy,
                CreatedDatetime = rj.CreatedDatetime,
                UpdatedBy = rj.UpdatedBy,
                UpdatedDatetime = rj.UpdatedDatetime,
                DurationMs = rj.DurationMs,
                FinishedAt = rj.FinishedAt,
                ErrorMessage = rj.ErrorMessage,
                StartedAt = rj.StartedAt
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<ReportJobDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}
