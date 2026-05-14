using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Mappings;
using QorstackReportService.Application.ExampleProducts.GetExampleProductsWithPagination;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.ExampleProducts.GetExampleProductById;

public class GetExampleProductByIdQueryHandler : IRequestHandler<GetExampleProductByIdQuery, ExampleProductDto?>
{
    private readonly IApplicationDbContext _context;

    public GetExampleProductByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ExampleProductDto?> Handle(GetExampleProductByIdQuery request, CancellationToken cancellationToken)
    {
        return await _context.ExampleProducts
            .Include(p => p.Category)
            .Where(p => p.ProductId == request.Id)
            .ProjectToType<ExampleProductDto>()
            .FirstOrDefaultAsync(cancellationToken);
    }
}
