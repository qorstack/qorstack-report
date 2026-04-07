using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.ExampleProducts.CreateExampleProduct;

/// <summary>
/// Command to create a new example product
/// </summary>
public class CreateExampleProductCommand : IRequest<int>
{
    /// <summary>
    /// Product Name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Product Price
    /// </summary>
    public decimal Price { get; set; }

    /// <summary>
    /// Category ID
    /// </summary>
    public int CategoryId { get; set; }
}
