using System.Text.Json;
using System.Text.Json.Serialization;
using FluentValidation.Results;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Reports.Models;

namespace QorstackReportService.Application.Common.JsonConverters;

// Render requests use one shape per field (v2.0):
//   keyed items   replace / image / qrcode / barcode / generateTotals / numberFormat → [{ "key": "name", ... }]
//   column lists  verticalMerge / collapse → ["col"];  sort → [{ "field": "col", "direction": "asc" }]
//   table rows    "columns": ["item", "qty"], "rows": [["A", 2], ["B", 3]]
// The v1 alternatives (object maps, single strings, rows of { key, value } cells) are rejected with a 400
// that names the field and shows the expected shape.

/// <summary>
/// Applies the keyed-list converter for <paramref name="field"/> to a request property:
/// <c>List&lt;KeyValueRequest&gt;</c> or <c>List&lt;T : IKeyedRequestItem&gt;</c>.
/// The field name is used in the error returned for the removed object-map form.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class KeyedListAttribute(string field) : JsonConverterAttribute
{
    public string Field { get; } = field;

    public override JsonConverter? CreateConverter(Type typeToConvert)
    {
        if (typeToConvert == typeof(List<KeyValueRequest>)) return new KeyValueListConverter(Field);

        if (typeToConvert.IsGenericType && typeToConvert.GetGenericTypeDefinition() == typeof(List<>))
        {
            var item = typeToConvert.GetGenericArguments()[0];
            if (typeof(IKeyedRequestItem).IsAssignableFrom(item) && item.IsClass)
                return (JsonConverter)Activator.CreateInstance(typeof(KeyedObjectListConverter<>).MakeGenericType(item), Field)!;
        }

        throw new InvalidOperationException($"[KeyedList] does not support {typeToConvert.Name}.");
    }
}

/// <summary>
/// Array-only converter for table fields: <c>List&lt;string&gt;</c> (column lists),
/// <c>List&lt;SortDefinition&gt;</c> and <c>List&lt;List&lt;JsonElement&gt;&gt;</c> (rows of cell values).
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class ArrayOnlyAttribute(string field) : JsonConverterAttribute
{
    public string Field { get; } = field;

    public override JsonConverter? CreateConverter(Type typeToConvert)
    {
        if (typeToConvert == typeof(List<string>)) return new ColumnListConverter(Field);
        if (typeToConvert == typeof(List<SortDefinition>)) return new SortListConverter(Field);
        if (typeToConvert == typeof(List<List<JsonElement>>)) return new TableRowsConverter(Field);
        throw new InvalidOperationException($"[ArrayOnly] does not support {typeToConvert.Name}.");
    }
}

internal static class RequestShapeErrors
{
    /// <summary>
    /// Thrown (not a JsonException) so it reaches the exception handler as a 400 with a field-level message
    /// instead of the framework's generic "failed to read request body".
    /// </summary>
    public static ValidationException Removed(string field, string message) =>
        new(new[] { new ValidationFailure(field, message) });

    public static ValidationException ObjectFormRemoved(string field, string example) =>
        Removed(field, $"{field} must be an array of {example}. The object form {{ \"name\": ... }} was removed in v2.0.");

    public static JsonException Unexpected(string field, string expected, JsonTokenType got) =>
        new($"{field}: expected {expected}, got {got}.");
}

/// <summary>Reads <c>[{ "key": "k", "value": "v" }]</c> into a list of <see cref="KeyValueRequest"/>.</summary>
public class KeyValueListConverter(string field) : JsonConverter<List<KeyValueRequest>>
{
    private const string Example = "{ \"key\": \"...\", \"value\": \"...\" }";

    public override List<KeyValueRequest>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.Null => null,
            JsonTokenType.StartArray => ReadItems(ref reader),
            JsonTokenType.StartObject => throw RequestShapeErrors.ObjectFormRemoved(field, Example),
            _ => throw RequestShapeErrors.Unexpected(field, $"an array of {Example}", reader.TokenType)
        };

    private List<KeyValueRequest> ReadItems(ref Utf8JsonReader reader)
    {
        var result = new List<KeyValueRequest>();
        while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
        {
            if (reader.TokenType != JsonTokenType.StartObject)
                throw RequestShapeErrors.Unexpected(field, $"an array of {Example}", reader.TokenType);

            var item = new KeyValueRequest();
            while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
            {
                var name = reader.GetString();
                reader.Read();
                if (string.Equals(name, "key", StringComparison.OrdinalIgnoreCase)) item.Key = ReadScalarAsString(ref reader);
                else if (string.Equals(name, "value", StringComparison.OrdinalIgnoreCase)) item.Value = ReadScalarAsString(ref reader);
                else reader.Skip();
            }
            result.Add(item);
        }
        return result;
    }

    public override void Write(Utf8JsonWriter writer, List<KeyValueRequest> value, JsonSerializerOptions options)
    {
        writer.WriteStartArray();
        foreach (var item in value)
        {
            writer.WriteStartObject();
            writer.WriteString("key", item.Key);
            writer.WriteString("value", item.Value);
            writer.WriteEndObject();
        }
        writer.WriteEndArray();
    }

    // Numbers and booleans are accepted as values and kept as their JSON text ("12.5", "true").
    private string ReadScalarAsString(ref Utf8JsonReader reader) => reader.TokenType switch
    {
        JsonTokenType.String => reader.GetString() ?? string.Empty,
        JsonTokenType.Null => string.Empty,
        JsonTokenType.Number or JsonTokenType.True or JsonTokenType.False => JsonDocument.ParseValue(ref reader).RootElement.GetRawText(),
        _ => throw RequestShapeErrors.Unexpected(field, "a string value", reader.TokenType)
    };
}

/// <summary>Reads <c>[{ "key": "logo", "src": "..." }]</c> into a list of keyed items.</summary>
public class KeyedObjectListConverter<T>(string field) : JsonConverter<List<T>> where T : class, IKeyedRequestItem
{
    private const string Example = "{ \"key\": \"...\", ... }";

    public override List<T>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.Null => null,
            JsonTokenType.StartArray => JsonSerializer.Deserialize<List<T>>(ref reader, options),
            JsonTokenType.StartObject => throw RequestShapeErrors.ObjectFormRemoved(field, Example),
            _ => throw RequestShapeErrors.Unexpected(field, $"an array of {Example}", reader.TokenType)
        };

    public override void Write(Utf8JsonWriter writer, List<T> value, JsonSerializerOptions options)
        => JsonSerializer.Serialize(writer, value.ToArray(), options);
}

/// <summary>Reads a list of column names: <c>["group", "category"]</c>. A single string is rejected.</summary>
public class ColumnListConverter(string field) : JsonConverter<List<string>>
{
    public override List<string>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType == JsonTokenType.String)
            throw RequestShapeErrors.Removed(field,
                $"{field} must be an array of column names, e.g. [\"group\"]. The string form was removed in v2.0.");
        if (reader.TokenType != JsonTokenType.StartArray)
            throw RequestShapeErrors.Unexpected(field, "an array of column names", reader.TokenType);

        var result = new List<string>();
        while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
        {
            if (reader.TokenType != JsonTokenType.String)
                throw RequestShapeErrors.Unexpected($"{field}[{result.Count}]", "a column name string", reader.TokenType);
            result.Add(reader.GetString() ?? string.Empty);
        }
        return result;
    }

    public override void Write(Utf8JsonWriter writer, List<string> value, JsonSerializerOptions options)
        => JsonSerializer.Serialize(writer, value.ToArray(), options);
}

/// <summary>Reads <c>[{ "field": "date", "direction": "desc" }]</c>. Strings ("date desc") and a single object are rejected.</summary>
public class SortListConverter(string field) : JsonConverter<List<SortDefinition>>
{
    private const string Example = "{ \"field\": \"...\", \"direction\": \"asc\" | \"desc\" }";

    public override List<SortDefinition>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType != JsonTokenType.StartArray)
            throw RequestShapeErrors.Removed(field,
                $"{field} must be an array of {Example}. The string and single-object forms were removed in v2.0.");

        var result = new List<SortDefinition>();
        while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
        {
            if (reader.TokenType != JsonTokenType.StartObject)
                throw RequestShapeErrors.Removed($"{field}[{result.Count}]",
                    $"{field} must be an array of {Example}. The string form (\"date desc\") was removed in v2.0.");

            var item = new SortDefinition();
            while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
            {
                var name = reader.GetString();
                reader.Read();
                if (string.Equals(name, "field", StringComparison.OrdinalIgnoreCase)) item.Field = reader.GetString() ?? string.Empty;
                else if (string.Equals(name, "direction", StringComparison.OrdinalIgnoreCase)) item.Direction = reader.GetString() ?? "asc";
                else reader.Skip();
            }
            result.Add(item);
        }
        return result;
    }

    public override void Write(Utf8JsonWriter writer, List<SortDefinition> value, JsonSerializerOptions options)
        => JsonSerializer.Serialize(writer, value.ToArray(), options);
}

/// <summary>
/// Reads table rows as arrays of cell values in <c>columns</c> order: <c>[["A", 2], ["B", 3]]</c>.
/// Cells are strings, numbers, booleans or null and are kept as <see cref="JsonElement"/>, as the table processors expect.
/// </summary>
public class TableRowsConverter(string field) : JsonConverter<List<List<JsonElement>>>
{
    private const string Shape =
        "an array of rows, each an array of cell values in the order of \"columns\", e.g. \"columns\": [\"item\", \"qty\"], \"rows\": [[\"A\", 2]]";

    public override List<List<JsonElement>>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType != JsonTokenType.StartArray)
            throw RequestShapeErrors.Removed(field, $"{field} must be {Shape}.");

        var rows = new List<List<JsonElement>>();
        while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
        {
            var rowPath = $"{field}[{rows.Count}]";
            if (reader.TokenType == JsonTokenType.StartObject)
                throw RequestShapeErrors.Removed(rowPath, $"{field} must be {Shape}. Rows as objects were removed in v2.0.");
            if (reader.TokenType != JsonTokenType.StartArray)
                throw RequestShapeErrors.Removed(rowPath, $"{field} must be {Shape}.");

            var row = new List<JsonElement>();
            while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
            {
                switch (reader.TokenType)
                {
                    case JsonTokenType.StartObject:
                        throw RequestShapeErrors.Removed($"{rowPath}[{row.Count}]",
                            $"{field} must be {Shape}. Cells as {{ \"key\", \"value\" }} objects were removed in v2.0 — list the keys once in \"columns\".");
                    case JsonTokenType.StartArray:
                        throw RequestShapeErrors.Removed($"{rowPath}[{row.Count}]", "A cell must be a string, number, boolean or null.");
                    default:
                        row.Add(JsonElement.ParseValue(ref reader));
                        break;
                }
            }
            rows.Add(row);
        }
        return rows;
    }

    public override void Write(Utf8JsonWriter writer, List<List<JsonElement>> value, JsonSerializerOptions options)
    {
        writer.WriteStartArray();
        foreach (var row in value)
        {
            writer.WriteStartArray();
            foreach (var cell in row) cell.WriteTo(writer);
            writer.WriteEndArray();
        }
        writer.WriteEndArray();
    }
}
