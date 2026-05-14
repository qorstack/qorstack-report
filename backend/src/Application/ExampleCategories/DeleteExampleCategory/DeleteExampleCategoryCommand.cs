using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.ExampleCategories.DeleteExampleCategory;

/// <summary>
/// Command to delete an example category
/// </summary>
public class DeleteExampleCategoryCommand : IRequest
{
    /// <summary>
    /// Category ID to delete
    /// </summary>
    public int Id { get; set; }
}