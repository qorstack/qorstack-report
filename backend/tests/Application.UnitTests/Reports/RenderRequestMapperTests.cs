using System.Text.Json;
using FluentAssertions;
using NUnit.Framework;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Reports.Models;

namespace QorstackReportService.Application.UnitTests.Reports;

/// <summary>Request → DocumentProcessingData mapping and the semantic checks (all errors reported at once).</summary>
[TestFixture]
public class RenderRequestMapperTests
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private static T Parse<T>(string json) => JsonSerializer.Deserialize<T>(json, Web)!;

    private static IList<ValidationError> Errors(Action act) =>
        act.Should().Throw<ValidationException>().Which.ValidationErrors;

    [Test]
    public void ColumnsAndRows_MapToRowDictionaries()
    {
        var request = Parse<PdfFromTemplateRequest>("""
        { "templateKey": "t", "table": [{ "columns": ["item", "qty"], "rows": [["A", 2], ["B", null]] }] }
        """);

        var data = RenderRequestMapper.ToDocumentProcessingData(request);

        var rows = data.Table[0].Rows;
        rows.Should().HaveCount(2);
        ((JsonElement)rows[0]["item"]!).GetString().Should().Be("A");
        ((JsonElement)rows[0]["qty"]!).GetInt32().Should().Be(2);
        rows[1]["qty"].Should().BeNull();
    }

    [Test]
    public void RowLengthMismatch_NamesTheRow()
    {
        var request = Parse<PdfFromTemplateRequest>("""
        { "templateKey": "t", "table": [{ "columns": ["item", "qty"], "rows": [["A", 2], ["B"]] }] }
        """);

        var errors = Errors(() => RenderRequestMapper.ToDocumentProcessingData(request));

        errors.Should().ContainSingle(e => e.Key == "table[0].rows[1]" && e.Message.Contains("1 value(s)") && e.Message.Contains("2 column(s)"));
    }

    [Test]
    public void DuplicateAndBlankColumns_AreRejected()
    {
        var request = Parse<PdfFromTemplateRequest>("""
        { "templateKey": "t", "table": [{ "columns": ["item", "item", " "], "rows": [] }] }
        """);

        var errors = Errors(() => RenderRequestMapper.ToDocumentProcessingData(request));

        errors.Select(e => e.Key).Should().BeEquivalentTo("table[0].columns[1]", "table[0].columns[2]");
    }

    [Test]
    public void MissingColumns_AreRejected()
    {
        var request = Parse<PdfFromTemplateRequest>("""{ "templateKey": "t", "table": [{ "rows": [["A"]] }] }""");

        Errors(() => RenderRequestMapper.ToDocumentProcessingData(request))
            .Should().ContainSingle(e => e.Key == "table[0].columns");
    }

    [Test]
    public void EmptyTable_NeedsNoColumns()
    {
        var request = Parse<PdfFromTemplateRequest>("""{ "templateKey": "t", "table": [{ "rows": [] }] }""");

        RenderRequestMapper.ToDocumentProcessingData(request).Table[0].Rows.Should().BeEmpty();
    }

    [Test]
    public void ColumnReferences_MustExist()
    {
        var request = Parse<ExcelFromTemplateRequest>("""
        {
          "templateKey": "t",
          "table": [{
            "columns": ["item", "amount"],
            "rows": [["A", 1]],
            "sort": [{ "field": "price", "direction": "down" }],
            "verticalMerge": ["group"],
            "collapse": ["item"],
            "generateTotals": [{ "key": "total", "value": "SUM" }, { "key": "amount", "value": "MEDIAN" }],
            "numberFormat": [{ "key": "amount", "value": "#,##0" }]
          }]
        }
        """);

        var keys = Errors(() => RenderRequestMapper.ToDocumentProcessingData(request)).Select(e => e.Key);

        keys.Should().BeEquivalentTo(
            "table[0].sort[0].field",
            "table[0].sort[0].direction",
            "table[0].verticalMerge[0]",
            "table[0].generateTotals[0].key",
            "table[0].generateTotals[1].value");
    }

    [Test]
    public void AllProblems_AreReportedTogether()
    {
        var request = Parse<PdfFromTemplateRequest>("""
        {
          "templateKey": "t",
          "templateVersion": 0,
          "fileType": "png",
          "replace": [{ "key": "a", "value": "1" }, { "key": "a", "value": "2" }, { "key": "", "value": "3" }],
          "image": [{ "key": "logo", "src": "", "fit": "stretch" }],
          "qrcode": [{ "key": "pay", "text": "" }],
          "barcode": [{ "key": "sku", "text": " " }]
        }
        """);

        var keys = Errors(() => RenderRequestMapper.ToDocumentProcessingData(request)).Select(e => e.Key);

        keys.Should().BeEquivalentTo(
            "fileType",
            "templateVersion",
            "replace[1].key",
            "replace[2].key",
            "image[0].src",
            "image[0].fit",
            "qrcode[0].text",
            "barcode[0].text");
    }

    [TestCase("pdf")]
    [TestCase("DOCX")]
    public void SupportedFileTypes_Pass(string fileType)
    {
        var request = Parse<PdfFromTemplateRequest>($$"""{ "templateKey": "t", "fileType": "{{fileType}}" }""");

        var act = () => RenderRequestMapper.ToDocumentProcessingData(request);

        act.Should().NotThrow();
    }

    [Test]
    public void Limits_RejectTooManyRowsAndItems_AndZeroMeansUnlimited()
    {
        var request = Parse<PdfFromTemplateRequest>("""
        { "templateKey": "t",
          "replace": [{ "key": "a", "value": "1" }, { "key": "b", "value": "2" }, { "key": "c", "value": "3" }],
          "table": [{ "columns": ["x"], "rows": [[1], [2], [3]] }] }
        """);

        var errors = Errors(() => RenderRequestMapper.ToDocumentProcessingData(request, new RenderLimits { MaxTableRows = 2, MaxItemsPerField = 2 }));
        errors.Select(e => e.Key).Should().BeEquivalentTo("replace", "table[0].rows");
        errors.Should().OnlyContain(e => e.Message.Contains("0 = unlimited"));

        var unlimited = RenderRequestMapper.ToDocumentProcessingData(request, new RenderLimits { MaxTableRows = 0, MaxItemsPerField = 0 });
        unlimited.Table[0].Rows.Should().HaveCount(3);
    }
}
