using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.ExampleProducts.DeleteExampleProduct;

/// <summary>
/// Command to delete an example product
/// </summary>
public class DeleteExampleProductCommand : IRequest
{
    /// <summary>
    /// Product ID to delete
    /// </summary>
    public int Id { get; set; }
}