namespace QorstackReportService.Application.ExampleProducts.GetExampleProductsWithPagination;

/// <summary>
/// Data Transfer Object for Example Product
/// </summary>
public class ExampleProductDto
{
    /// <summary>
    /// Product ID
    /// </summary>
    public int ProductId { get; set; }

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

    /// <summary>
    /// Category Name
    /// </summary>
    public string CategoryName { get; set; } = string.Empty;

    /// <summary>
    /// Created Date
    /// </summary>
    public DateTime? CreatedDatetime { get; set; }

    /// <summary>
    /// Created By
    /// </summary>
    public string? CreatedBy { get; set; }

    /// <summary>
    /// Last Modified Date
    /// </summary>
    public DateTime? UpdatedDatetime { get; set; }

    /// <summary>
    /// Last Modified By
    /// </summary>
    public string? UpdatedBy { get; set; }
}