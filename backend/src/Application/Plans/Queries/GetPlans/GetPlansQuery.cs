using QorstackReportService.Application.Common.Mappings;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Plans.Queries.GetPlans;

/// <summary>
/// Query to get all available plans
/// </summary>
public class GetPlansQuery : IRequest<PaginatedList<PlanDto>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

/// <summary>
/// Handler for GetPlansQuery
/// </summary>
public class GetPlansQueryHandler : IRequestHandler<GetPlansQuery, PaginatedList<PlanDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPlansQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<PlanDto>> Handle(GetPlansQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Plans
            .Where(p => p.IsActive == true && p.IsShow == true)
            .OrderBy(p => p.DisplayOrder);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new PlanDto
            {
                Id = p.Id,
                Name = p.Name,
                Code = p.Code,
                Price = p.Price,
                Currency = p.Currency,
                FeaturesConfig = p.FeaturesConfig,
                IsShow = p.IsShow,
                DisplayOrder = p.DisplayOrder,
                IsActive = p.IsActive,
                CreatedBy = p.CreatedBy,
                CreatedDatetime = p.CreatedDatetime,
                UpdatedBy = p.UpdatedBy,
                UpdatedDatetime = p.UpdatedDatetime
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<PlanDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}
