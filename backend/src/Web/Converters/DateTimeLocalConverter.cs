using System.Text.Json;
using System.Text.Json.Serialization;

namespace QorstackReportService.Web.Converters;

public class DateTimeLocalConverter : JsonConverter<DateTime>
{
    public override DateTime Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options)
    {
        // Read as DateTime (Kind can be Utc or Unspecified)
        var utc = reader.GetDateTime();
        // Convert to local time
        var local = utc.ToLocalTime();
        // Set Kind=Unspecified to write to timestamp without time zone
        return DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
    }

    public override void Write(
        Utf8JsonWriter writer,
        DateTime value,
        JsonSerializerOptions options)
    {
        // Set Kind=Unspecified before serializing
        var unspecified = DateTime.SpecifyKind(value, DateTimeKind.Unspecified);
        writer.WriteStringValue(unspecified);
    }
}
