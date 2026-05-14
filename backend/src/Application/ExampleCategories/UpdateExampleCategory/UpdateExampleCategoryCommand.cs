using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.ExampleCategories.UpdateExampleCategory;

/// <summary>
/// Command to update an existing example category
/// </summary>
public class UpdateExampleCategoryCommand : IRequest
{
    /// <summary>
    /// Category ID
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Category Name
    /// </summary>
    public string Name { get; set; } = string.Empty;
}
