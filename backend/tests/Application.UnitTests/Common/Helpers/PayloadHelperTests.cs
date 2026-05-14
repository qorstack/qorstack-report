using System.Text.Json.Nodes;
using QorstackReportService.Application.Common.Helpers;
using QorstackReportService.Application.Common.Interfaces;
using NUnit.Framework;

namespace QorstackReportService.Application.UnitTests.Common.Helpers;

[TestFixture]
public class PayloadHelperTests
{
    [Test]
    public void SyncPayloadWithMarkers_ShouldGroupTableVariables_WhenMarkersAreInTable()
    {
        // Arrange
        var markers = new List<TemplateMarker>
        {
            new() { Name = "product_name", Type = "variable", IsTable = true, TableIndex = 0 },
            new() { Name = "quantity", Type = "variable", IsTable = true, TableIndex = 0 },
            new() { Name = "price", Type = "variable", IsTable = true, TableIndex = 0 },
            new() { Name = "customer_name", Type = "variable", IsTable = false },
            new() { Name = "other_col", Type = "variable", IsTable = true, TableIndex = 1 }
        };

        string? currentPayload = null;

        // Act
        var resultJson = PayloadHelper.SyncPayloadWithMarkers(currentPayload, markers);
        var result = JsonNode.Parse(resultJson);

        // Assert
        Assert.That(result, Is.Not.Null);

        // Check "replace" section (should only have customer_name)
        var replace = result["replace"]?.AsObject();
        Assert.That(replace, Is.Not.Null);
        Assert.That(replace.ContainsKey("customer_name"), Is.True);
        Assert.That(replace.ContainsKey("product_name"), Is.False); // Should be in table

        // Check "table" section (not "tables" anymore)
        var tables = result["table"]?.AsArray();
        Assert.That(tables, Is.Not.Null);
        Assert.That(tables.Count, Is.EqualTo(2)); // Should have 2 tables (index 0 and 1)

        // Table 0
        var table0 = tables[0]?.AsObject();
        Assert.That(table0, Is.Not.Null);
        var rows0 = table0["rows"]?.AsArray();
        Assert.That(rows0, Is.Not.Null);
        Assert.That(rows0, Is.Not.Empty);
        var row0 = rows0[0]?.AsObject();
        Assert.That(row0, Is.Not.Null);
        Assert.That(row0.ContainsKey("product_name"), Is.True);
        Assert.That(row0.ContainsKey("quantity"), Is.True);
        Assert.That(row0.ContainsKey("price"), Is.True);
        // Check Sort/GroupBy defaults
        Assert.That(table0.ContainsKey("sort"), Is.True);
        Assert.That(table0["sort"]?.AsArray(), Is.Not.Null);

        // Table 1
        var table1 = tables[1]?.AsObject();
        Assert.That(table1, Is.Not.Null);
        var rows1 = table1["rows"]?.AsArray();
        Assert.That(rows1, Is.Not.Null);
        Assert.That(rows1, Is.Not.Empty);
        var row1 = rows1[0]?.AsObject();
        Assert.That(row1, Is.Not.Null);
        Assert.That(row1.ContainsKey("other_col"), Is.True);
    }

    [Test]
    public void SyncPayloadWithMarkers_ShouldPreserveExistingTables_WhenUpdating()
    {
        // Arrange
        var markers = new List<TemplateMarker>
        {
            new() { Name = "new_col", Type = "variable", IsTable = true, TableIndex = 0 }
        };

        // Old format for initial payload to test migration
        var initialPayload = new JsonObject
        {
            ["table"] = new JsonArray
            {
                new JsonObject
                {
                    ["rows"] = new JsonArray
                    {
                        new JsonObject { ["existing_col"] = "val" }
                    }
                }
            }
        }.ToJsonString();

        // Act
        var resultJson = PayloadHelper.SyncPayloadWithMarkers(initialPayload, markers, deleteUnused: false);
        var result = JsonNode.Parse(resultJson);

        // Assert
        var table0 = result?["table"]?[0]?.AsObject();
        Assert.That(table0, Is.Not.Null);
        var rows0 = table0!["rows"]?.AsArray();
        Assert.That(rows0, Is.Not.Null);
        var row0 = rows0![0]?.AsObject();

        Assert.That(row0, Is.Not.Null);
        Assert.That(row0!.ContainsKey("existing_col"), Is.True);
        Assert.That(row0!.ContainsKey("new_col"), Is.True);
    }

    [Test]
    public void SyncPayloadWithMarkers_ShouldRemoveUnused_WhenDeleteUnusedIsTrue()
    {
         // Arrange
        var markers = new List<TemplateMarker>
        {
             // No markers
        };

        var initialPayload = new JsonObject
        {
            ["replace"] = new JsonObject { ["unused"] = "val" },
            ["table"] = new JsonArray
            {
                 new JsonObject
                 {
                     ["rows"] = new JsonArray { new JsonObject { ["col"] = "val" } }
                 }
            }
        }.ToJsonString();

        // Act
        var resultJson = PayloadHelper.SyncPayloadWithMarkers(initialPayload, markers, deleteUnused: true);
        var result = JsonNode.Parse(resultJson);

        // Assert
        var replace = result?["replace"]?.AsObject();
        Assert.That(replace, Is.Not.Null);
        Assert.That(replace!.ContainsKey("unused"), Is.False);

        var tables = result?["table"]?.AsArray();
        Assert.That(tables, Is.Not.Null);
        Assert.That(tables!.Count, Is.EqualTo(0));
    }
}
