using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.ExampleCategories.GetExampleCategoriesWithPagination;

namespace QorstackReportService.Application.ExampleCategories.GetExampleCategoryById;

/// <summary>
/// Query to get a single example category by ID
/// </summary>
public class GetExampleCategoryByIdQuery : IRequest<ExampleCategoryDto?>
{
    /// <summary>
    /// Category ID
    /// </summary>
    public int Id { get; set; }
}
