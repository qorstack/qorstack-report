using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Mappings;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.ExampleProducts.GetExampleProductsWithPagination;

/// <summary>
/// Handler for GetExampleProductsWithPaginationQuery
/// </summary>
public class GetExampleProductsWithPaginationQueryHandler : IRequestHandler<GetExampleProductsWithPaginationQuery, PaginatedList<ExampleProductDto>>
{
    private readonly IApplicationDbContext _context;

    public GetExampleProductsWithPaginationQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<ExampleProductDto>> Handle(GetExampleProductsWithPaginationQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ExampleProducts
            .Include(p => p.Category)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            query = query.Where(p => p.Name.Contains(request.SearchTerm));

        if (request.CategoryId.HasValue)
            query = query.Where(p => p.CategoryId == request.CategoryId.Value);

        return await query.ProjectToType<ExampleProductDto>()
            .PaginatedListAsync(request.PageNumber, request.PageSize);
    }
}
