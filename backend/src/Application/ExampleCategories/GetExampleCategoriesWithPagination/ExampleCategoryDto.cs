namespace QorstackReportService.Application.ExampleCategories.GetExampleCategoriesWithPagination;

/// <summary>
/// Data Transfer Object for Example Category
/// </summary>
public class ExampleCategoryDto
{
    /// <summary>
    /// Category ID
    /// </summary>
    public int CategoryId { get; set; }

    /// <summary>
    /// Category Name
    /// </summary>
    public string Name { get; set; } = string.Empty;

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