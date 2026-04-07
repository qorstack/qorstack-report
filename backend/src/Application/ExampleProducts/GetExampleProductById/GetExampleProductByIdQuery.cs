using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.ExampleProducts.GetExampleProductsWithPagination;

namespace QorstackReportService.Application.ExampleProducts.GetExampleProductById;

public class GetExampleProductByIdQuery : IRequest<ExampleProductDto?>
{
    public int Id { get; set; }
}
