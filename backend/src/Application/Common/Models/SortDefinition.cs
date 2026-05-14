using System.Text.Json.Serialization;

namespace QorstackReportService.Application.Common.Models;

/// <summary>
/// Definition for sorting operations
/// </summary>
public class SortDefinition
{
    /// <summary>
    /// The field name to sort by
    /// </summary>
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    /// <summary>
    /// The sort direction (asc or desc)
    /// </summary>
    [JsonPropertyName("direction")]
    public string Direction { get; set; } = "asc";
}
