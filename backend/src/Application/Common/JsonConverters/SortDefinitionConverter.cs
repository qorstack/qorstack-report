using System.Text.Json;
using System.Text.Json.Serialization;
using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Application.Common.JsonConverters;

/// <summary>
/// Custom converter for SortDefinition list to support both string ("field desc") and object formats
/// </summary>
public class SortDefinitionConverter : JsonConverter<List<SortDefinition>>
{
    public override List<SortDefinition>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
        {
            return null;
        }

        var result = new List<SortDefinition>();

        // Handle Array: ["name", "age desc", {"field": "x", "direction": "desc"}]
        if (reader.TokenType == JsonTokenType.StartArray)
        {
            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.EndArray) break;

                var item = ParseSortDefinition(ref reader, options);
                if (item != null) result.Add(item);
            }
        }
        // Handle Single Object: {"field": "name", "direction": "desc"}
        else if (reader.TokenType == JsonTokenType.StartObject)
        {
            var item = ParseSortDefinition(ref reader, options);
            if (item != null) result.Add(item);
        }
        // Handle Single String: "name desc"
        else if (reader.TokenType == JsonTokenType.String)
        {
            var item = ParseSortDefinition(ref reader, options);
            if (item != null) result.Add(item);
        }

        return result;
    }

    private SortDefinition? ParseSortDefinition(ref Utf8JsonReader reader, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            var str = reader.GetString();
            if (string.IsNullOrWhiteSpace(str)) return null;

            var parts = str.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var def = new SortDefinition { Field = parts[0] };

            if (parts.Length > 1)
            {
                def.Direction = parts[1].ToLowerInvariant();
            }

            return def;
        }
        else if (reader.TokenType == JsonTokenType.StartObject)
        {
            // Use JsonSerializer to deserialize standard object
            try
            {
                return JsonSerializer.Deserialize<SortDefinition>(ref reader, options);
            }
            catch
            {
                return null;
            }
        }

        // Skip unknown tokens
        reader.Skip();
        return null;
    }

    public override void Write(Utf8JsonWriter writer, List<SortDefinition> value, JsonSerializerOptions options)
    {
        JsonSerializer.Serialize(writer, value, options);
    }
}
