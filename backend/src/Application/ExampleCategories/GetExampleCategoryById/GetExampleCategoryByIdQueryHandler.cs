using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Mappings;
using QorstackReportService.Application.ExampleCategories.GetExampleCategoriesWithPagination;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.ExampleCategories.GetExampleCategoryById;

/// <summary>
/// Handler for GetExampleCategoryByIdQuery
/// </summary>
public class GetExampleCategoryByIdQueryHandler : IRequestHandler<GetExampleCategoryByIdQuery, ExampleCategoryDto?>
{
    private readonly IApplicationDbContext _context;

    public GetExampleCategoryByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ExampleCategoryDto?> Handle(GetExampleCategoryByIdQuery request, CancellationToken cancellationToken)
    {
        return await _context.ExampleCategories
            .Where(c => c.CategoryId == request.Id)
            .ProjectToType<ExampleCategoryDto>()
            .FirstOrDefaultAsync(cancellationToken);
    }
}
