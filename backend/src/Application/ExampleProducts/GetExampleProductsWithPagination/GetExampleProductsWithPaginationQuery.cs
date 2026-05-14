using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Application.ExampleProducts.GetExampleProductsWithPagination;

/// <summary>
/// Query to get paginated list of example products
/// </summary>
public class GetExampleProductsWithPaginationQuery : IRequest<PaginatedList<ExampleProductDto>>
{
    /// <summary>
    /// Page number (1-based)
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// Number of items per page
    /// </summary>
    public int PageSize { get; set; } = 10;

    /// <summary>
    /// Search term for product name
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Filter by category ID
    /// </summary>
    public int? CategoryId { get; set; }
}
