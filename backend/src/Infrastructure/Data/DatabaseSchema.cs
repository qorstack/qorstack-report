using System.Text.RegularExpressions;

namespace QorstackReportService.Infrastructure.Data;

public static class DatabaseSchema
{
    private static readonly Regex ValidSchemaPattern = new("^[a-zA-Z_][a-zA-Z0-9_]*$", RegexOptions.Compiled);

    public static string Name { get; private set; } = "public";

    public static void Set(string? schemaName)
    {
        var value = string.IsNullOrWhiteSpace(schemaName) ? "public" : schemaName.Trim();

        if (!ValidSchemaPattern.IsMatch(value))
        {
            throw new InvalidOperationException(
                $"Invalid Database:Schema value '{value}'. Schema names must match [a-zA-Z_][a-zA-Z0-9_]*.");
        }

        Name = value;
    }
}
