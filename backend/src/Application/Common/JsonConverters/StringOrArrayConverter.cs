using System.Text.Json;
using System.Text.Json.Serialization;

namespace QorstackReportService.Application.Common.JsonConverters;

/// <summary>
/// Converts a JSON string or an array of strings into a List<string>
/// </summary>
public class StringOrArrayConverter : JsonConverter<List<string>>
{
    public override List<string>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
        {
            return null;
        }

        var result = new List<string>();

        if (reader.TokenType == JsonTokenType.String)
        {
            var value = reader.GetString();
            if (!string.IsNullOrEmpty(value))
            {
                result.Add(value);
            }
            return result;
        }
        else if (reader.TokenType == JsonTokenType.StartArray)
        {
            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.EndArray)
                {
                    return result;
                }

                if (reader.TokenType == JsonTokenType.String)
                {
                    var value = reader.GetString();
                    if (!string.IsNullOrEmpty(value))
                    {
                        result.Add(value);
                    }
                }
            }
        }

        return result;
    }

    public override void Write(Utf8JsonWriter writer, List<string> value, JsonSerializerOptions options)
    {
        if (value == null)
        {
            writer.WriteNullValue();
            return;
        }

        if (value.Count == 1)
        {
            writer.WriteStringValue(value[0]);
        }
        else
        {
            writer.WriteStartArray();
            foreach (var item in value)
            {
                writer.WriteStringValue(item);
            }
            writer.WriteEndArray();
        }
    }
}
