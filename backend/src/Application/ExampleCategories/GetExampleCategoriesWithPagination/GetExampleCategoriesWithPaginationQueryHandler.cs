using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Mappings;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.ExampleCategories.GetExampleCategoriesWithPagination;

/// <summary>
/// Handler for GetExampleCategoriesWithPaginationQuery
/// </summary>
public class GetExampleCategoriesWithPaginationQueryHandler : IRequestHandler<GetExampleCategoriesWithPaginationQuery, PaginatedList<ExampleCategoryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetExampleCategoriesWithPaginationQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<ExampleCategoryDto>> Handle(GetExampleCategoriesWithPaginationQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ExampleCategories.AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            query = query.Where(c => c.Name.Contains(request.SearchTerm));

        return await query.ProjectToType<ExampleCategoryDto>()
            .PaginatedListAsync(request.PageNumber, request.PageSize);
    }
}
