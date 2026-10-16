using System.Text.Json;
using System.Text.Json.Nodes;

namespace QorstackReportService.Application.Common.Helpers;

/// <summary>
/// Sandbox payloads are stored in the object-map shape (<c>{ "replace": { "name": "x" } }</c>), which the
/// template builder UI and <see cref="PayloadHelper"/> read. Requests use keyed arrays
/// (<c>{ "replace": [{ "key": "name", "value": "x" }] }</c>) and tables as <c>"columns"</c> + value-array
/// <c>"rows"</c>; this converts them to the stored shape (one object per row; <c>columns</c> is kept).
/// Payloads already in map shape are returned unchanged.
/// </summary>
public static class KeyedPayloadNormalizer
{
    private static readonly string[] ScalarMaps = ["replace"];
    private static readonly string[] ObjectMaps = ["image", "qrcode", "barcode"];
    private static readonly string[] TableScalarMaps = ["generateTotals", "numberFormat"];

    /// <summary>Converts keyed arrays in <paramref name="payload"/> to object maps, in place.</summary>
    public static JsonObject Normalize(JsonObject payload)
    {
        foreach (var name in ScalarMaps) ConvertArrayProperty(payload, name, scalar: true);
        foreach (var name in ObjectMaps) ConvertArrayProperty(payload, name, scalar: false);

        if (payload["table"] is JsonArray tables)
        {
            foreach (var table in tables.OfType<JsonObject>())
            {
                if (table["rows"] is JsonArray rows)
                {
                    var columns = (table["columns"] as JsonArray)?.Select(c => c?.GetValue<string>() ?? string.Empty).ToList();
                    for (var i = 0; i < rows.Count; i++)
                    {
                        if (rows[i] is not JsonArray cells) continue;
                        rows[i] = cells.Any(c => c is JsonObject) || columns == null
                            ? ToMap(cells, scalar: true)          // v1 keyed cells: [{ "key", "value" }]
                            : ZipRow(columns, cells);            // v2: "columns" + value arrays
                    }
                }
                foreach (var name in TableScalarMaps) ConvertArrayProperty(table, name, scalar: true);
            }
        }
        return payload;
    }

    /// <summary>String overload; returns the input unchanged when it is empty or not a JSON object.</summary>
    public static string? Normalize(string? payloadJson)
    {
        if (string.IsNullOrWhiteSpace(payloadJson)) return payloadJson;
        try
        {
            return JsonNode.Parse(payloadJson) is JsonObject obj
                ? Normalize(obj).ToJsonString(new JsonSerializerOptions { WriteIndented = false })
                : payloadJson;
        }
        catch (JsonException)
        {
            return payloadJson;
        }
    }

    private static void ConvertArrayProperty(JsonObject owner, string name, bool scalar)
    {
        if (owner[name] is JsonArray array) owner[name] = ToMap(array, scalar);
    }

    /// <summary><c>["A", 2]</c> with columns <c>["item", "qty"]</c> → <c>{ "item": "A", "qty": 2 }</c>.</summary>
    private static JsonObject ZipRow(IReadOnlyList<string> columns, JsonArray values)
    {
        var map = new JsonObject();
        for (var c = 0; c < columns.Count && c < values.Count; c++)
        {
            if (!string.IsNullOrEmpty(columns[c])) map[columns[c]] = values[c]?.DeepClone();
        }
        return map;
    }

    /// <summary>
    /// <c>[{ "key": "k", "value": v }]</c> → <c>{ "k": v }</c> (scalar), or
    /// <c>[{ "key": "k", ...props }]</c> → <c>{ "k": { ...props } }</c> (object). Items without a key are skipped.
    /// </summary>
    private static JsonObject ToMap(JsonArray array, bool scalar)
    {
        var map = new JsonObject();
        foreach (var item in array.OfType<JsonObject>())
        {
            var key = item["key"]?.GetValue<string>();
            if (string.IsNullOrEmpty(key)) continue;

            if (scalar)
            {
                map[key] = item["value"]?.DeepClone();
            }
            else
            {
                var copy = (JsonObject)item.DeepClone();
                copy.Remove("key");
                map[key] = copy;
            }
        }
        return map;
    }
}
