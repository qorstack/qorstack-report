using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.ExampleProducts.UpdateExampleProduct;

/// <summary>
/// Command to update an existing example product
/// </summary>
public class UpdateExampleProductCommand : IRequest
{
    /// <summary>
    /// Product ID
    /// </summary>
    public int Id { get; set; }

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