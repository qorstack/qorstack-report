using System.Text.Json;
using FluentAssertions;
using NUnit.Framework;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Reports.Models;

namespace QorstackReportService.Application.UnitTests.Reports;

/// <summary>
/// v2 request contract (JSON shape): keyed arrays, column lists, columns + rows tables.
/// The v1 alternatives are rejected with a field-level message.
/// </summary>
[TestFixture]
public class KeyedRequestFormTests
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    [Test]
    public void V2Shapes_AreAccepted()
    {
        const string json = """
        {
          "templateKey": "t",
          "templateVersion": 3,
          "replace": [{ "key": "customer", "value": "ACME" }, { "key": "total", "value": 8800.5 }],
          "image": [{ "key": "logo", "src": "https://x/logo.png" }],
          "qrcode": [{ "key": "pay", "text": "promptpay" }],
          "barcode": [{ "key": "sku", "text": "123" }],
          "table": [{
            "columns": ["name", "qty", "note"],
            "rows": [["A", 2, null], ["B", 3, true]],
            "sort": [{ "field": "qty", "direction": "desc" }],
            "verticalMerge": ["name"],
            "collapse": ["name"]
          }]
        }
        """;

        var request = JsonSerializer.Deserialize<PdfFromTemplateRequest>(json, Web)!;

        request.TemplateVersion.Should().Be(3);
        request.Replace![1].Value.Should().Be("8800.5");
        request.Image![0].Key.Should().Be("logo");
        var table = request.Table![0];
        table.Columns.Should().Equal("name", "qty", "note");
        table.Rows.Should().HaveCount(2);
        table.Rows[0][1].GetInt32().Should().Be(2);
        table.Rows[0][2].ValueKind.Should().Be(JsonValueKind.Null);
        table.Sort![0].Direction.Should().Be("desc");
        table.VerticalMerge.Should().Equal("name");
    }

    [Test]
    public void ExcelTableKeyedLists_AreAccepted()
    {
        const string json = """
        { "templateKey": "t", "table": [{ "columns": ["amount"], "rows": [], "generateTotals": [{ "key": "amount", "value": "sum" }], "numberFormat": [{ "key": "amount", "value": "#,##0.00" }] }] }
        """;

        var request = JsonSerializer.Deserialize<ExcelFromTemplateRequest>(json, Web)!;

        request.Table![0].GenerateTotals![0].Value.Should().Be("sum");
        request.Table![0].NumberFormat![0].Key.Should().Be("amount");
    }

    [TestCase("""{ "replace": { "customer": "ACME" } }""", "replace")]
    [TestCase("""{ "image": { "logo": { "src": "x" } } }""", "image")]
    [TestCase("""{ "qrcode": { "pay": { "text": "x" } } }""", "qrcode")]
    [TestCase("""{ "barcode": { "sku": { "text": "x" } } }""", "barcode")]
    public void ObjectForm_IsRejected_WithFieldName(string json, string field)
    {
        var error = Reject<PdfFromTemplateRequest>(json);
        error.Key.Should().Be(field);
        error.Message.Should().Contain("must be an array").And.Contain("removed in v2.0");
    }

    [TestCase("""{ "table": [{ "columns": ["name"], "rows": [[{ "key": "name", "value": "A" }]] }] }""", "table.rows[0][0]", "columns")]
    [TestCase("""{ "table": [{ "rows": [{ "name": "A" }] }] }""", "table.rows[0]", "removed in v2.0")]
    [TestCase("""{ "table": [{ "columns": ["name"], "rows": [], "sort": "name desc" }] }""", "table.sort", "removed in v2.0")]
    [TestCase("""{ "table": [{ "columns": ["name"], "rows": [], "sort": ["name desc"] }] }""", "table.sort[0]", "removed in v2.0")]
    [TestCase("""{ "table": [{ "columns": ["name"], "rows": [], "verticalMerge": "name" }] }""", "table.verticalMerge", "string form was removed")]
    [TestCase("""{ "table": [{ "columns": ["name"], "rows": [], "collapse": "name" }] }""", "table.collapse", "string form was removed")]
    public void V1TableForms_AreRejected(string json, string field, string message)
    {
        var error = Reject<PdfFromTemplateRequest>(json);
        error.Key.Should().Be(field);
        error.Message.Should().Contain(message);
    }

    [TestCase("""{ "table": [{ "columns": ["amount"], "rows": [], "generateTotals": { "amount": "sum" } }] }""", "table.generateTotals")]
    [TestCase("""{ "table": [{ "columns": ["amount"], "rows": [], "numberFormat": { "amount": "#,##0" } }] }""", "table.numberFormat")]
    public void ExcelObjectForm_IsRejected_WithFieldName(string json, string field) =>
        Reject<ExcelFromTemplateRequest>(json).Key.Should().Be(field);

    private static ValidationError Reject<T>(string json)
    {
        var act = () => JsonSerializer.Deserialize<T>(json, Web);
        return act.Should().Throw<ValidationException>().Which.ValidationErrors.Single();
    }
}
