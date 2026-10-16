using System.Text.Json.Serialization;

namespace QorstackReportService.Application.Reports.Models;

/// <summary>
/// An item addressed by the template marker name it fills (e.g. "logo" for {{image:logo}}).
/// </summary>
public interface IKeyedRequestItem
{
    /// <summary>Marker name in the template</summary>
    string Key { get; set; }
}

/// <summary>
/// A marker name with a text value — used by <c>replace</c>, <c>generateTotals</c> and <c>numberFormat</c>.
/// </summary>
public class KeyValueRequest : IKeyedRequestItem
{
    /// <summary>Marker / column name</summary>
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    /// <summary>Text value</summary>
    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;
}
