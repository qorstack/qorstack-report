using System.Text.Json.Nodes;
using FluentAssertions;
using NUnit.Framework;
using QorstackReportService.Application.Common.Helpers;

namespace QorstackReportService.Application.UnitTests.Reports;

/// <summary>Stored sandbox payloads keep one object per table row, whatever request shape they came from.</summary>
[TestFixture]
public class KeyedPayloadNormalizerTests
{
    [Test]
    public void ColumnsAndValueRows_BecomeRowMaps()
    {
        var payload = JsonNode.Parse("""
        { "table": [{ "columns": ["item", "qty"], "rows": [["A", 2], ["B", null]] }] }
        """)!.AsObject();

        var rows = KeyedPayloadNormalizer.Normalize(payload)["table"]![0]!["rows"]!.AsArray();

        rows[0]!["item"]!.GetValue<string>().Should().Be("A");
        rows[0]!["qty"]!.GetValue<int>().Should().Be(2);
        rows[1]!.AsObject().ContainsKey("qty").Should().BeTrue();
    }

    [Test]
    public void KeyedCellRows_StillBecomeRowMaps()
    {
        var payload = JsonNode.Parse("""
        { "table": [{ "rows": [[{ "key": "item", "value": "A" }]] }] }
        """)!.AsObject();

        KeyedPayloadNormalizer.Normalize(payload)["table"]![0]!["rows"]![0]!["item"]!.GetValue<string>().Should().Be("A");
    }

    [Test]
    public void ObjectRows_AreUnchanged()
    {
        var payload = JsonNode.Parse("""{ "table": [{ "rows": [{ "item": "A" }] }] }""")!.AsObject();

        KeyedPayloadNormalizer.Normalize(payload)["table"]![0]!["rows"]![0]!["item"]!.GetValue<string>().Should().Be("A");
    }
}
