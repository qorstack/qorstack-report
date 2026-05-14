using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.ExampleCategories.CreateExampleCategory;

/// <summary>
/// Command to create a new example category
/// </summary>
public class CreateExampleCategoryCommand : IRequest<int>
{
    /// <summary>
    /// Category Name
    /// </summary>
    public string Name { get; set; } = string.Empty;
}
