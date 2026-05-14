using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Application.ExampleCategories.GetExampleCategoriesWithPagination;

/// <summary>
/// Query to get paginated list of example categories
/// </summary>
public class GetExampleCategoriesWithPaginationQuery : IRequest<PaginatedList<ExampleCategoryDto>>
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
    /// Search term for category name
    /// </summary>
    public string? SearchTerm { get; set; }
}