using System.Globalization;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using ClosedXML.Graphics;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Infrastructure.Services.Document;

/// <summary>
/// Processes Excel (.xlsx) templates using ClosedXML.
/// Supports: variable replacement, table expansion, images, QR codes, barcodes,
/// grouping, vertical merge, collapse, aggregation, and Excel-specific features.
/// </summary>
public class ExcelProcessingService : IExcelProcessingService
{
    // FontFreeGraphicEngine: computes all font metrics from font size alone — zero system font
    // access, zero file I/O. SixLabors.Fonts is never called.
    //
    // Why this approach:
    //   Every DefaultGraphicEngine constructor (including CreateOnlyWithFonts) eventually
    //   calls SixLabors.Fonts which lazily creates FileFontMetrics for system/bundled fonts
    //   via file paths. A single font with an invalid GDEF 'classFormat 0' causes
    //   InvalidFontFileException in CalculateMaxDigitWidth. Custom engine avoids this entirely.
    //   Column widths will be approximate (±5%) but functionally correct.
    //   Font NAMES in the output xlsx are preserved from the template's styles.xml — the engine
    //   is used only for metric calculations, not for naming fonts.
    private static readonly LoadOptions WorkbookLoadOptions = new() { GraphicEngine = new FontFreeGraphicEngine() };

    /// <summary>
    /// An <see cref="IXLGraphicEngine"/> that approximates font metrics from point size only,
    /// with no access to font files, system fonts, or SixLabors.Fonts.
    /// </summary>
    private sealed class FontFreeGraphicEngine : IXLGraphicEngine
    {
        // Calibri 11pt at 96 DPI → max digit width ≈ 7 px.  Ratio = 7 / (11 * 96/72) ≈ 0.477
        private const double DigitRatio = 0.477;
        // Average character ≈ 60% of em square width
        private const double CharRatio = 0.60;

        public double GetMaxDigitWidth(IXLFontBase font, double dpiX)
            => Math.Round(font.FontSize * (dpiX / 72.0) * DigitRatio);

        public double GetTextWidth(string text, IXLFontBase font, double dpiX)
            => text.Length * font.FontSize * (dpiX / 72.0) * CharRatio;

        public double GetTextHeight(IXLFontBase font, double dpiY)
            => Math.Round(font.FontSize * (dpiY / 72.0) * 1.2);

        public double GetDescent(IXLFontBase font, double dpiY)
            => Math.Round(font.FontSize * (dpiY / 72.0) * 0.2);

        public GlyphBox GetGlyphBox(ReadOnlySpan<int> graphemeCluster, IXLFontBase font, Dpi dpi)
        {
            var em = font.FontSize * (dpi.Y / 72.0);
            var advance = font.FontSize * (dpi.X / 72.0) * CharRatio;
            return new GlyphBox((float)advance, (float)em, (float)(em * 0.2));
        }

        public XLPictureInfo GetPictureInfo(Stream imageStream, ClosedXML.Excel.Drawings.XLPictureFormat expectedFormat)
        {
            // Delegate image reading to DefaultGraphicEngine — image loading does not involve fonts.
            try
            {
                var asm = typeof(DefaultGraphicEngine).Assembly;
                using var fallbackRes = asm.GetManifestResourceStream("ClosedXML.Graphics.Fonts.CarlitoBare-Regular.ttf");
                if (fallbackRes != null)
                {
                    var ms = new MemoryStream();
                    fallbackRes.CopyTo(ms);
                    ms.Position = 0;
                    var engine = DefaultGraphicEngine.CreateOnlyWithFonts(ms);
                    imageStream.Position = 0;
                    return engine.GetPictureInfo(imageStream, expectedFormat);
                }
            }
            catch { /* ignore */ }

            // Last-resort fallback: return a default 100x100px picture
            var fmt = expectedFormat == ClosedXML.Excel.Drawings.XLPictureFormat.Unknown
                ? ClosedXML.Excel.Drawings.XLPictureFormat.Png : expectedFormat;
            return new XLPictureInfo(fmt, new System.Drawing.Size(100, 100), new System.Drawing.Size(100, 100));
        }
    }

    private static readonly Regex GeneralMarkerPattern = new(@"\{\{.*?\}\}", RegexOptions.Compiled);
    private static readonly Regex RowMarkerPattern = new(@"\{\{row:(\w+)\}\}", RegexOptions.Compiled);
    private static readonly Regex GroupMarkerPattern = new(@"\{\{group:(\w+)\}\}", RegexOptions.Compiled);
    private static readonly Regex ImageMarkerPattern = new(@"\{\{image:(\w+)\}\}", RegexOptions.Compiled);
    private static readonly Regex QrMarkerPattern = new(@"\{\{(?:qr|qrcode):(\w+)\}\}", RegexOptions.Compiled);
    private static readonly Regex BarcodeMarkerPattern = new(@"\{\{barcode:(\w+)\}\}", RegexOptions.Compiled);
    private static readonly Regex IfMarkerPattern = new(@"\{\{if:(\w+)\}\}", RegexOptions.Compiled);
    private static readonly Regex RowAggregatePattern = new(@"\{\{(row_sum|row_avg):([^}]+)\}\}", RegexOptions.Compiled);
    private static readonly Regex GroupAggregatePattern = new(@"\{\{(group_sum|group_avg|group_min|group_max|group_count)(?::([^}]+))?\}\}", RegexOptions.Compiled);
    private static readonly Regex TableAggregatePattern = new(@"\{\{(table_sum|table_avg|table_count|table_min|table_max)(?::([^}]+))?\}\}", RegexOptions.Compiled);
    private static readonly Regex VariableMarkerPattern = new(@"\{\{(\w+)\}\}", RegexOptions.Compiled);

    private readonly IQrCodeService _qrCodeService;
    private readonly IBarcodeService _barcodeService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMinioStorageService _storageService;
    private readonly ILogger<ExcelProcessingService> _logger;

    public ExcelProcessingService(
        IQrCodeService qrCodeService,
        IBarcodeService barcodeService,
        IHttpClientFactory httpClientFactory,
        IMinioStorageService storageService,
        ILogger<ExcelProcessingService> logger)
    {
        _qrCodeService = qrCodeService;
        _barcodeService = barcodeService;
        _httpClientFactory = httpClientFactory;
        _storageService = storageService;
        _logger = logger;
    }

    public async Task<Stream> ProcessTemplateAsync(Stream templateStream, DocumentProcessingData data, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting Excel template processing");

        var ms = new MemoryStream();
        await templateStream.CopyToAsync(ms, cancellationToken);
        ms.Position = 0;

        using var workbook = new XLWorkbook(ms, WorkbookLoadOptions);

        // Preload resources
        var preloadedImages = await PreloadImagesAsync(data.Image, cancellationToken);
        var preloadedQrCodes = await PreloadQrCodesAsync(data.Qrcode, cancellationToken);
        var preloadedBarcodes = await PreloadBarcodesAsync(data.Barcode, cancellationToken);

        // Track global table index across all sheets
        var globalTableIndex = 0;

        foreach (var worksheet in workbook.Worksheets.ToList())
        {
            // Process tables first (may insert/delete rows)
            globalTableIndex = ProcessTablesInSheet(worksheet, data, globalTableIndex, preloadedImages, preloadedQrCodes, preloadedBarcodes);

            // Process variable replacement in all cells
            ProcessVariableReplacement(worksheet, data.Replace);

            // Process image/QR/barcode markers in cells
            ProcessMediaMarkers(worksheet, preloadedImages, preloadedQrCodes, preloadedBarcodes,
                data.Image, data.Qrcode, data.Barcode);
        }

        var output = new MemoryStream();
        workbook.SaveAs(output);
        output.Position = 0;

        // Post-process: replace media markers in TextBox shapes (ClosedXML can't access these)
        output = ReplaceTextBoxMediaMarkers(output, preloadedImages, preloadedQrCodes, preloadedBarcodes,
            data.Image, data.Qrcode, data.Barcode);

        _logger.LogInformation("Excel template processing completed");
        return output;
    }

    public Task<TemplateValidationResult> ValidateTemplateAsync(Stream templateStream)
    {
        var result = new TemplateValidationResult { IsValid = true };

        try
        {
            templateStream.Position = 0;
            using var workbook = new XLWorkbook(templateStream, WorkbookLoadOptions);

            foreach (var worksheet in workbook.Worksheets)
            {
                var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 0;
                var lastCol = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;

                for (var row = 1; row <= lastRow; row++)
                {
                    for (var col = 1; col <= lastCol; col++)
                    {
                        var cellText = worksheet.Cell(row, col).GetString();
                        if (string.IsNullOrEmpty(cellText)) continue;

                        // Check for unclosed markers
                        var openCount = cellText.Split("{{").Length - 1;
                        var closeCount = cellText.Split("}}").Length - 1;
                        if (openCount != closeCount)
                        {
                            result.IsValid = false;
                            result.Errors.Add($"Sheet '{worksheet.Name}' Cell {worksheet.Cell(row, col).Address}: Unclosed marker detected in \"{cellText}\"");
                        }
                    }
                }
            }
        }
        catch (Exception ex) when (ex.GetType().FullName?.Contains("InvalidFontFileException", StringComparison.Ordinal) == true
                                || ex.Message.Contains("classFormat", StringComparison.OrdinalIgnoreCase)
                                || ex.Message.Contains("SixLabors.Fonts", StringComparison.OrdinalIgnoreCase))
        {
            // Font scan errors are environmental, not template authoring errors — don't fail validation
            _logger.LogWarning(ex, "Excel validation skipped: font scanning failed");
        }
        catch (Exception ex)
        {
            result.IsValid = false;
            result.Errors.Add($"Failed to open Excel file: {ex.Message}");
        }

        return Task.FromResult(result);
    }

    public Task<Stream> AddGridlineBordersAsync(Stream excelStream, CancellationToken cancellationToken = default)
    {
        excelStream.Position = 0;
        var workbook = new XLWorkbook(excelStream, WorkbookLoadOptions);

        var gridColor = XLColor.FromHtml("#D0D0D0"); // light gray

        foreach (var ws in workbook.Worksheets)
        {
            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
            var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
            if (lastRow == 0 || lastCol == 0) continue;

            for (int r = 1; r <= lastRow; r++)
            {
                for (int c = 1; c <= lastCol; c++)
                {
                    var cell = ws.Cell(r, c);
                    var border = cell.Style.Border;

                    // Only set borders that don't already have a style
                    if (border.TopBorder == XLBorderStyleValues.None)
                    {
                        border.TopBorder = XLBorderStyleValues.Thin;
                        border.TopBorderColor = gridColor;
                    }
                    if (border.BottomBorder == XLBorderStyleValues.None)
                    {
                        border.BottomBorder = XLBorderStyleValues.Thin;
                        border.BottomBorderColor = gridColor;
                    }
                    if (border.LeftBorder == XLBorderStyleValues.None)
                    {
                        border.LeftBorder = XLBorderStyleValues.Thin;
                        border.LeftBorderColor = gridColor;
                    }
                    if (border.RightBorder == XLBorderStyleValues.None)
                    {
                        border.RightBorder = XLBorderStyleValues.Thin;
                        border.RightBorderColor = gridColor;
                    }
                }
            }
        }

        var output = new MemoryStream();
        workbook.SaveAs(output);
        workbook.Dispose();
        output.Position = 0;
        return Task.FromResult<Stream>(output);
    }

    public Task<List<TemplateMarker>> ExtractMarkersAsync(Stream templateStream)
    {
        var markers = new List<TemplateMarker>();
        templateStream.Position = 0;

        // Use DocumentFormat.OpenXml (no font scanning) to read cell text reliably in Docker/Linux.
        // ClosedXML's DefaultGraphicEngine can fail silently on environments without system fonts,
        // returning empty markers and wiping the auto-detected payload.
        try
        {
            var ms = new MemoryStream();
            templateStream.CopyTo(ms);
            ms.Position = 0;

            using var doc = SpreadsheetDocument.Open(ms, false);
            var wbPart = doc.WorkbookPart;
            if (wbPart == null) return Task.FromResult(markers);

            // Build shared string lookup
            var sharedStrings = wbPart.SharedStringTablePart?.SharedStringTable
                .Elements<SharedStringItem>()
                .Select(si => si.InnerText)
                .ToArray() ?? [];

            foreach (var wsPart in wbPart.WorksheetParts)
            {
                var sheetData = wsPart.Worksheet.GetFirstChild<SheetData>();
                if (sheetData == null) continue;

                // Local helper to parse marker text and add to markers list
                void AddMarkersFromText(string text)
                {
                    foreach (Match match in GeneralMarkerPattern.Matches(text))
                    {
                        var rawText = match.Value;
                        var inner = rawText.TrimStart('{').TrimEnd('}');

                        string type = "variable";
                        string name = inner;

                        if (inner.StartsWith("row:")) { type = "table"; name = inner[4..]; }
                        else if (inner.StartsWith("group:")) { type = "table"; name = inner[6..]; }
                        else if (inner.StartsWith("image:")) { type = "image"; name = inner[6..]; }
                        else if (inner.StartsWith("qr:") || inner.StartsWith("qrcode:")) { type = "qr"; name = inner.Contains(':') ? inner[(inner.IndexOf(':') + 1)..] : inner; }
                        else if (inner.StartsWith("barcode:")) { type = "barcode"; name = inner[8..]; }
                        else if (inner.StartsWith("if:")) { type = "condition"; name = inner[3..]; }
                        else if (inner.StartsWith("row_sum:") || inner.StartsWith("row_avg:")) { type = "table"; name = inner; }
                        else if (inner.StartsWith("group_sum:") || inner.StartsWith("group_avg:") ||
                                 inner.StartsWith("group_min:") || inner.StartsWith("group_max:") ||
                                 inner == "group_count") { type = "table"; name = inner; }
                        else if (inner.StartsWith("table_sum:") || inner.StartsWith("table_avg:") ||
                                 inner == "table_count") { type = "table"; name = inner; }

                        if (!markers.Any(m => m.Name == name && m.Type == type))
                        {
                            markers.Add(new TemplateMarker
                            {
                                Name = name,
                                Type = type,
                                RawText = rawText,
                                IsTable = type == "table",
                                SectionPriority = 1
                            });
                        }
                    }
                }

                // Scan cell values
                foreach (var row in sheetData.Elements<Row>())
                {
                    foreach (var cell in row.Elements<Cell>())
                    {
                        string cellText;
                        if (cell.DataType?.Value == CellValues.SharedString)
                        {
                            if (!int.TryParse(cell.CellValue?.Text, out var idx) || idx >= sharedStrings.Length) continue;
                            cellText = sharedStrings[idx];
                        }
                        else
                        {
                            cellText = cell.CellValue?.Text ?? cell.InnerText;
                        }

                        if (!string.IsNullOrEmpty(cellText))
                            AddMarkersFromText(cellText);
                    }
                }

                // Scan TextBox / shape text in drawing parts (markers placed in text boxes)
                if (wsPart.DrawingsPart?.WorksheetDrawing != null)
                {
                    foreach (var shape in wsPart.DrawingsPart.WorksheetDrawing
                        .Descendants<DocumentFormat.OpenXml.Drawing.Spreadsheet.Shape>())
                    {
                        // Collect all <a:t> text runs in the shape
                        var shapeText = string.Join("",
                            shape.Descendants().Where(e => e.LocalName == "t").Select(e => e.InnerText));
                        if (!string.IsNullOrEmpty(shapeText))
                            AddMarkersFromText(shapeText);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Excel marker extraction failed — returning partial results");
        }

        return Task.FromResult(markers);
    }

    #region Table Processing

    /// <summary>
    /// Detect table regions and expand them with data. Returns updated global table index.
    /// </summary>
    private int ProcessTablesInSheet(
        IXLWorksheet worksheet,
        DocumentProcessingData data,
        int globalTableIndex,
        Dictionary<string, byte[]> images,
        Dictionary<string, byte[]> qrCodes,
        Dictionary<string, byte[]> barcodes)
    {
        var tableRegions = DetectTableRegions(worksheet);

        if (tableRegions.Count == 0) return globalTableIndex;

        // Process from bottom to top to avoid row shift issues
        for (var i = tableRegions.Count - 1; i >= 0; i--)
        {
            var region = tableRegions[i];
            var tableIndex = globalTableIndex + i;

            if (tableIndex >= data.Table.Count)
            {
                _logger.LogWarning("Table region {Index} in sheet '{Sheet}' has no matching data (only {Count} tables provided)",
                    tableIndex, worksheet.Name, data.Table.Count);
                continue;
            }

            var tableData = data.Table[tableIndex];
            ExpandTableRegion(worksheet, region, tableData, images, qrCodes, barcodes);
        }

        return globalTableIndex + tableRegions.Count;
    }

    /// <summary>
    /// Detects table regions by finding rows with {{row:...}} markers
    /// </summary>
    private List<TableRegion> DetectTableRegions(IXLWorksheet worksheet)
    {
        var regions = new List<TableRegion>();
        var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 0;
        var lastCol = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;

        // Find all rows that contain {{row:...}} markers
        var templateRows = new List<int>();
        for (var row = 1; row <= lastRow; row++)
        {
            for (var col = 1; col <= lastCol; col++)
            {
                var text = worksheet.Cell(row, col).GetString();
                if (RowMarkerPattern.IsMatch(text) || VariableMarkerPattern.IsMatch(text))
                {
                    // Only count if it has row markers specifically
                    if (RowMarkerPattern.IsMatch(text))
                    {
                        templateRows.Add(row);
                        break;
                    }
                }
            }
        }

        // Group contiguous template rows into regions
        foreach (var templateRow in templateRows.Distinct().OrderBy(r => r))
        {
            // Check if this row is part of an existing region (contiguous)
            var existingRegion = regions.LastOrDefault();
            if (existingRegion != null && templateRow <= existingRegion.TemplateRowEnd + 1)
            {
                existingRegion.TemplateRowEnd = templateRow;
                continue;
            }

            // Detect header row(s) above the template row
            var headerStart = templateRow;
            for (var r = templateRow - 1; r >= 1; r--)
            {
                var rowText = GetRowText(worksheet, r, lastCol);
                if (GroupMarkerPattern.IsMatch(rowText) || GroupAggregatePattern.IsMatch(rowText))
                {
                    headerStart = r;
                }
                else
                {
                    break;
                }
            }

            // Detect footer row(s) below the template row
            var footerEnd = templateRow;
            for (var r = templateRow + 1; r <= lastRow; r++)
            {
                var rowText = GetRowText(worksheet, r, lastCol);
                if (GroupAggregatePattern.IsMatch(rowText) || TableAggregatePattern.IsMatch(rowText))
                {
                    footerEnd = r;
                }
                else
                {
                    break;
                }
            }

            regions.Add(new TableRegion
            {
                HeaderRowStart = headerStart < templateRow ? headerStart : 0,
                HeaderRowEnd = headerStart < templateRow ? templateRow - 1 : 0,
                TemplateRowStart = templateRow,
                TemplateRowEnd = templateRow,
                FooterRowStart = footerEnd > templateRow ? templateRow + 1 : 0,
                FooterRowEnd = footerEnd > templateRow ? footerEnd : 0,
                LastColumn = lastCol
            });
        }

        return regions;
    }

    /// <summary>
    /// Expands a table region with actual data rows
    /// </summary>
    private void ExpandTableRegion(
        IXLWorksheet worksheet,
        TableRegion region,
        TableData tableData,
        Dictionary<string, byte[]> images,
        Dictionary<string, byte[]> qrCodes,
        Dictionary<string, byte[]> barcodes)
    {
        var rows = tableData.Rows;
        if (rows.Count == 0)
        {
            // No data — remove template rows
            DeleteRegionRows(worksheet, region);
            return;
        }

        // Sort rows if configured — filter out empty entries first
        var validSort = tableData.Sort?.Where(s => !string.IsNullOrEmpty(s.Field)).ToList();
        if (validSort != null && validSort.Count > 0)
        {
            rows = SortRows(rows, validSort);
        }

        // Collapse if configured
        if (tableData.CollapseFields != null && tableData.CollapseFields.Count > 0)
        {
            rows = CollapseRows(rows, tableData.CollapseFields);
        }

        // Determine grouping
        string? groupField = null;
        if (tableData.VerticalMergeFields != null && tableData.VerticalMergeFields.Count > 0)
        {
            groupField = tableData.VerticalMergeFields[0];
        }
        else
        {
            // Detect from template markers
            for (var col = 1; col <= region.LastColumn; col++)
            {
                if (region.HeaderRowStart > 0)
                {
                    for (var r = region.HeaderRowStart; r <= region.HeaderRowEnd; r++)
                    {
                        var text = worksheet.Cell(r, col).GetString();
                        var gm = GroupMarkerPattern.Match(text);
                        if (gm.Success)
                        {
                            groupField = gm.Groups[1].Value;
                            break;
                        }
                    }
                }
                if (groupField != null) break;
            }
        }

        // Calculate template row count (for multi-row templates)
        var templateRowCount = region.TemplateRowEnd - region.TemplateRowStart + 1;

        // Store template row styles and content
        var templateRowData = new List<TemplateCellInfo[]>();
        for (var r = region.TemplateRowStart; r <= region.TemplateRowEnd; r++)
        {
            var cells = new TemplateCellInfo[region.LastColumn];
            for (var col = 1; col <= region.LastColumn; col++)
            {
                var cell = worksheet.Cell(r, col);
                cells[col - 1] = new TemplateCellInfo
                {
                    Text = cell.GetString(),
                    Style = cell.Style,
                    HasFormula = cell.HasFormula,
                    FormulaA1 = cell.HasFormula ? cell.FormulaA1 : null,
                    DataType = cell.DataType
                };
            }
            templateRowData.Add(cells);
        }

        // Store header/footer templates if present
        var headerTemplates = CaptureRowTemplates(worksheet, region.HeaderRowStart, region.HeaderRowEnd, region.LastColumn);
        var footerTemplates = CaptureRowTemplates(worksheet, region.FooterRowStart, region.FooterRowEnd, region.LastColumn);

        // Delete original template region rows
        var totalOriginalRows = (region.FooterRowEnd > 0 ? region.FooterRowEnd : region.TemplateRowEnd)
                                - (region.HeaderRowStart > 0 ? region.HeaderRowStart : region.TemplateRowStart) + 1;
        var insertRow = region.HeaderRowStart > 0 ? region.HeaderRowStart : region.TemplateRowStart;

        // Delete original region
        var deleteFrom = insertRow;
        var deleteTo = deleteFrom + totalOriginalRows - 1;
        worksheet.Rows(deleteFrom, deleteTo).Delete();

        // Now insert data rows
        if (groupField != null && (headerTemplates.Count > 0 || footerTemplates.Count > 0))
        {
            // Grouped rendering
            InsertGroupedRows(worksheet, insertRow, rows, groupField, templateRowData, templateRowCount,
                headerTemplates, footerTemplates, tableData, region.LastColumn, images, qrCodes, barcodes);
        }
        else
        {
            // Simple rendering
            var currentRow = insertRow;
            for (var dataIdx = 0; dataIdx < rows.Count; dataIdx++)
            {
                for (var tr = 0; tr < templateRowCount; tr++)
                {
                    worksheet.Row(currentRow).InsertRowsAbove(1);
                    var newRow = worksheet.Row(currentRow);
                    ApplyTemplateRow(worksheet, currentRow, templateRowData[tr], rows[dataIdx], tableData, region.LastColumn, images, qrCodes, barcodes, rows, dataIdx);
                    currentRow++;
                }
            }

            // Apply table aggregates at the end
            if (footerTemplates.Count > 0)
            {
                foreach (var footerTemplate in footerTemplates)
                {
                    worksheet.Row(currentRow).InsertRowsAbove(1);
                    ApplyAggregateRow(worksheet, currentRow, footerTemplate, rows, tableData, region.LastColumn);
                    currentRow++;
                }
            }

            var dataEndRow = currentRow - 1;

            // Vertical merge
            if (tableData.VerticalMergeFields != null && tableData.VerticalMergeFields.Count > 0)
            {
                ApplyVerticalMerge(worksheet, insertRow, dataEndRow, templateRowData, tableData.VerticalMergeFields, region.LastColumn);
            }

            // Excel-specific features
            ApplyExcelFeatures(worksheet, tableData, insertRow, dataEndRow, region.LastColumn, rows);

            // Outline grouping
            if (tableData.Outline && groupField != null)
            {
                ApplyOutlineGrouping(worksheet, insertRow, rows, groupField, templateRowCount);
            }
        }
    }

    private void InsertGroupedRows(
        IXLWorksheet worksheet,
        int startRow,
        List<Dictionary<string, object?>> rows,
        string groupField,
        List<TemplateCellInfo[]> templateRowData,
        int templateRowCount,
        List<TemplateCellInfo[]> headerTemplates,
        List<TemplateCellInfo[]> footerTemplates,
        TableData tableData,
        int lastCol,
        Dictionary<string, byte[]> images,
        Dictionary<string, byte[]> qrCodes,
        Dictionary<string, byte[]> barcodes)
    {
        // Sort by group field first so non-adjacent rows with the same value
        // (e.g. a=1 at positions 0 and 3) are combined into a single group.
        // GroupBy key MUST use .ToString() — raw object? values (e.g. JsonElement)
        // fail equality checks even when their string representations match.
        var sorted = rows.OrderBy(r => GetCellValue(r, groupField)?.ToString() ?? "").ToList();
        var groups = sorted.GroupBy(r => GetCellValue(r, groupField)?.ToString() ?? "").ToList();
        var currentRow = startRow;

        foreach (var group in groups)
        {
            var groupRows = group.ToList();
            var groupStartRow = currentRow;

            // Insert group header
            foreach (var headerTemplate in headerTemplates)
            {
                worksheet.Row(currentRow).InsertRowsAbove(1);
                ApplyGroupHeaderFooterRow(worksheet, currentRow, headerTemplate, groupField, group.Key?.ToString() ?? "",
                    groupRows, rows, tableData, lastCol);
                currentRow++;
            }

            // Insert data rows
            var dataStartRow = currentRow;
            for (var dataIdx = 0; dataIdx < groupRows.Count; dataIdx++)
            {
                for (var tr = 0; tr < templateRowCount; tr++)
                {
                    worksheet.Row(currentRow).InsertRowsAbove(1);
                    ApplyTemplateRow(worksheet, currentRow, templateRowData[tr], groupRows[dataIdx], tableData, lastCol, images, qrCodes, barcodes, groupRows, dataIdx);
                    currentRow++;
                }
            }

            // Insert group footer
            foreach (var footerTemplate in footerTemplates)
            {
                worksheet.Row(currentRow).InsertRowsAbove(1);
                ApplyGroupHeaderFooterRow(worksheet, currentRow, footerTemplate, groupField, group.Key?.ToString() ?? "",
                    groupRows, rows, tableData, lastCol);
                currentRow++;
            }

            // Apply outline grouping on data rows within this group
            if (tableData.Outline && currentRow > groupStartRow + headerTemplates.Count)
            {
                var outlineStart = groupStartRow + headerTemplates.Count;
                var outlineEnd = currentRow - footerTemplates.Count - 1;
                if (outlineEnd >= outlineStart)
                {
                    worksheet.Rows(outlineStart, outlineEnd).Group();
                }
            }
        }

        // Apply table-level aggregate row
        // (Table aggregates are handled via marker replacement in the expanded data)
    }

    #endregion

    #region Row Application

    private void ApplyTemplateRow(
        IXLWorksheet worksheet,
        int rowNumber,
        TemplateCellInfo[] template,
        Dictionary<string, object?> rowData,
        TableData tableData,
        int lastCol,
        Dictionary<string, byte[]> images,
        Dictionary<string, byte[]> qrCodes,
        Dictionary<string, byte[]> barcodes,
        List<Dictionary<string, object?>> allRows,
        int currentDataIndex)
    {
        for (var col = 1; col <= lastCol && col <= template.Length; col++)
        {
            var cell = worksheet.Cell(rowNumber, col);
            var tmpl = template[col - 1];

            // Copy style
            cell.Style = tmpl.Style;

            if (tmpl.HasFormula && tmpl.FormulaA1 != null)
            {
                cell.FormulaA1 = tmpl.FormulaA1;
                continue;
            }

            var text = tmpl.Text;
            if (string.IsNullOrEmpty(text)) continue;

            // Replace row markers
            text = ReplaceRowMarkers(text, rowData);

            // Replace row aggregates (row_sum, row_avg)
            text = ReplaceRowAggregates(text, rowData);

            // Check for image/QR/barcode
            var imageMatch = ImageMarkerPattern.Match(text);
            if (imageMatch.Success && text.Trim() == imageMatch.Value)
            {
                var key = imageMatch.Groups[1].Value;
                if (images.TryGetValue(key, out var imgBytes))
                {
                    InsertImageInCell(worksheet, cell, imgBytes);
                }
                continue;
            }

            var qrMatch = QrMarkerPattern.Match(text);
            if (qrMatch.Success && text.Trim() == qrMatch.Value)
            {
                var key = qrMatch.Groups[1].Value;
                if (qrCodes.TryGetValue(key, out var qrBytes))
                {
                    InsertImageInCell(worksheet, cell, qrBytes);
                }
                continue;
            }

            var barcodeMatch = BarcodeMarkerPattern.Match(text);
            if (barcodeMatch.Success && text.Trim() == barcodeMatch.Value)
            {
                var key = barcodeMatch.Groups[1].Value;
                if (barcodes.TryGetValue(key, out var bcBytes))
                {
                    InsertImageInCell(worksheet, cell, bcBytes);
                }
                continue;
            }

            // Apply number format if configured
            if (tableData.NumberFormat != null)
            {
                foreach (var (field, format) in tableData.NumberFormat)
                {
                    if (tmpl.Text.Contains($"{{{{row:{field}}}}}"))
                    {
                        cell.Style.NumberFormat.Format = format;
                        break;
                    }
                }
            }

            // Set cell value with type preservation
            SetCellValueSmart(cell, text, tmpl.Text);
        }
    }

    private void ApplyGroupHeaderFooterRow(
        IXLWorksheet worksheet,
        int rowNumber,
        TemplateCellInfo[] template,
        string groupField,
        string groupValue,
        List<Dictionary<string, object?>> groupRows,
        List<Dictionary<string, object?>> allRows,
        TableData tableData,
        int lastCol)
    {
        for (var col = 1; col <= lastCol && col <= template.Length; col++)
        {
            var cell = worksheet.Cell(rowNumber, col);
            var tmpl = template[col - 1];

            cell.Style = tmpl.Style;

            var text = tmpl.Text;
            if (string.IsNullOrEmpty(text)) continue;

            // Replace group marker
            text = text.Replace($"{{{{group:{groupField}}}}}", groupValue);

            // Replace group_count
            text = text.Replace("{{group_count}}", groupRows.Count.ToString());

            // Replace group aggregates
            text = ReplaceGroupAggregates(text, groupRows);

            // Replace table aggregates
            text = ReplaceTableAggregates(text, allRows);

            SetCellValueSmart(cell, text, tmpl.Text);
        }
    }

    private void ApplyAggregateRow(
        IXLWorksheet worksheet,
        int rowNumber,
        TemplateCellInfo[] template,
        List<Dictionary<string, object?>> allRows,
        TableData tableData,
        int lastCol)
    {
        for (var col = 1; col <= lastCol && col <= template.Length; col++)
        {
            var cell = worksheet.Cell(rowNumber, col);
            var tmpl = template[col - 1];

            cell.Style = tmpl.Style;

            var text = tmpl.Text;
            if (string.IsNullOrEmpty(text)) continue;

            // Replace table aggregates
            text = ReplaceTableAggregates(text, allRows);
            text = text.Replace("{{table_count}}", allRows.Count.ToString());

            SetCellValueSmart(cell, text, tmpl.Text);
        }
    }

    #endregion

    #region Variable Replacement

    private void ProcessVariableReplacement(IXLWorksheet worksheet, Dictionary<string, string?> variables)
    {
        if (variables.Count == 0) return;

        var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 0;
        var lastCol = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;

        for (var row = 1; row <= lastRow; row++)
        {
            for (var col = 1; col <= lastCol; col++)
            {
                var cell = worksheet.Cell(row, col);
                if (cell.HasFormula) continue;

                var text = cell.GetString();
                if (string.IsNullOrEmpty(text) || !text.Contains("{{")) continue;

                // Skip row/group/image/qr/barcode markers — they're handled elsewhere
                if (RowMarkerPattern.IsMatch(text) || GroupMarkerPattern.IsMatch(text) ||
                    ImageMarkerPattern.IsMatch(text) || QrMarkerPattern.IsMatch(text) ||
                    BarcodeMarkerPattern.IsMatch(text) || RowAggregatePattern.IsMatch(text) ||
                    GroupAggregatePattern.IsMatch(text) || TableAggregatePattern.IsMatch(text)) continue;

                var originalText = text;
                var replaced = false;

                foreach (var (key, value) in variables)
                {
                    var marker = $"{{{{{key}}}}}";
                    if (!text.Contains(marker)) continue;

                    // Skip when value is null/empty or literal "null" string — leave marker intact
                    // so the placeholder remains visible (callers often serialize missing fields as "null").
                    if (string.IsNullOrEmpty(value) || string.Equals(value, "null", StringComparison.OrdinalIgnoreCase))
                        continue;

                    text = text.Replace(marker, value);
                    replaced = true;
                }

                if (replaced)
                {
                    SetCellValueSmart(cell, text, originalText);
                }
            }
        }
    }

    #endregion

    #region Media (Image, QR, Barcode)

    private void ProcessMediaMarkers(
        IXLWorksheet worksheet,
        Dictionary<string, byte[]> images,
        Dictionary<string, byte[]> qrCodes,
        Dictionary<string, byte[]> barcodes,
        Dictionary<string, ImageData?> imageData,
        Dictionary<string, QrCodeData?> qrData,
        Dictionary<string, BarcodeData?> barcodeData)
    {
        var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 0;
        var lastCol = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;

        for (var row = 1; row <= lastRow; row++)
        {
            for (var col = 1; col <= lastCol; col++)
            {
                var cell = worksheet.Cell(row, col);
                var text = cell.GetString().Trim();
                if (string.IsNullOrEmpty(text)) continue;

                // Image
                var imageMatch = ImageMarkerPattern.Match(text);
                if (imageMatch.Success && text == imageMatch.Value)
                {
                    var key = imageMatch.Groups[1].Value;
                    if (images.TryGetValue(key, out var imgBytes))
                    {
                        cell.Value = "";
                        var meta = imageData.TryGetValue(key, out var m) ? m : null;
                        InsertImageInCell(worksheet, cell, imgBytes, meta?.Width, meta?.Height);
                    }
                    continue;
                }

                // QR Code
                var qrMatch = QrMarkerPattern.Match(text);
                if (qrMatch.Success && text == qrMatch.Value)
                {
                    var key = qrMatch.Groups[1].Value;
                    if (qrCodes.TryGetValue(key, out var qrBytes))
                    {
                        cell.Value = "";
                        var qrMeta = qrData.TryGetValue(key, out var q) ? q : null;
                        var qrSize = qrMeta?.Size ?? 120;
                        InsertImageInCell(worksheet, cell, qrBytes, qrSize, qrSize);
                    }
                    continue;
                }

                // Barcode — preserve image aspect ratio so text label isn't squished.
                // The generated barcode image = Width × (Height + textArea). The user's
                // Height applies to the barcode bars only; text has its natural size.
                var barcodeMatch = BarcodeMarkerPattern.Match(text);
                if (barcodeMatch.Success && text == barcodeMatch.Value)
                {
                    var key = barcodeMatch.Groups[1].Value;
                    if (barcodes.TryGetValue(key, out var bcBytes))
                    {
                        cell.Value = "";
                        var bcMeta = barcodeData.TryGetValue(key, out var b) ? b : null;
                        var (renderW, renderH) = ComputeBarcodeRenderSize(
                            bcBytes, bcMeta?.Width ?? 200, bcMeta?.Height ?? 100);
                        InsertImageInCell(worksheet, cell, bcBytes, renderW, renderH);
                    }
                    continue;
                }
            }
        }
    }

    /// <summary>
    /// Computes the render size for a barcode image. The user specifies Width × Height
    /// for the barcode bars only — the generated PNG includes a text label below at
    /// natural font size, so the PNG is taller than Height. We preserve the image's
    /// actual aspect ratio (using the user's Width) so the text label isn't squished.
    /// </summary>
    private static (int width, int height) ComputeBarcodeRenderSize(byte[] pngBytes, int userWidth, int userHeight)
    {
        if (pngBytes == null || pngBytes.Length < 24 ||
            pngBytes[0] != 0x89 || pngBytes[1] != 0x50) return (userWidth, userHeight);

        // PNG header: width at bytes 16-19, height at 20-23 (big-endian)
        var actualW = (pngBytes[16] << 24) | (pngBytes[17] << 16) | (pngBytes[18] << 8) | pngBytes[19];
        var actualH = (pngBytes[20] << 24) | (pngBytes[21] << 16) | (pngBytes[22] << 8) | pngBytes[23];
        if (actualW <= 0 || actualH <= 0) return (userWidth, userHeight);

        // Scale to user's width, maintain aspect ratio (text label gets proportional space)
        var renderH = (int)Math.Round((double)actualH * userWidth / actualW);
        return (userWidth, renderH);
    }

    private void InsertImageInCell(IXLWorksheet worksheet, IXLCell cell, byte[] imageBytes,
        int? targetWidth = null, int? targetHeight = null)
    {
        using var imgStream = new MemoryStream(imageBytes);
        var picture = worksheet.AddPicture(imgStream)
            .MoveTo(cell);

        var col = worksheet.Column(cell.Address.ColumnNumber);
        var row = worksheet.Row(cell.Address.RowNumber);
        var curColW = col.Width;   // characters
        var curRowH = row.Height;  // points

        if (targetWidth is > 0 && targetHeight is > 0)
        {
            // Only EXPAND — never shrink below the template's original design
            var neededColW = targetWidth.Value / 7.5;
            var neededRowH = targetHeight.Value / 1.33;
            if (neededColW > curColW) col.Width = neededColW;
            if (neededRowH > curRowH) row.Height = neededRowH;
            picture.WithSize(targetWidth.Value, targetHeight.Value);
        }
        else
        {
            // No target dimensions — scale picture to fit current cell
            var maxWPx = (int)(curColW * 7.5);
            var maxHPx = (int)(curRowH * 1.33);
            if (maxWPx > 10 && maxHPx > 10)
            {
                var scale = Math.Min((double)maxWPx / picture.Width, (double)maxHPx / picture.Height);
                if (scale < 1.0)
                    picture.WithSize((int)(picture.Width * scale), (int)(picture.Height * scale));
            }
        }
    }

    /// <summary>
    /// Post-process: find media markers ({{image:…}}, {{qrcode:…}}, {{barcode:…}}) inside
    /// TextBox shapes and replace the shape with an image at the same anchor position.
    /// ClosedXML cannot access drawing shapes, so we use raw OpenXML after save.
    /// </summary>
    private MemoryStream ReplaceTextBoxMediaMarkers(
        MemoryStream input,
        Dictionary<string, byte[]> images,
        Dictionary<string, byte[]> qrCodes,
        Dictionary<string, byte[]> barcodes,
        Dictionary<string, ImageData?> imageData,
        Dictionary<string, QrCodeData?> qrData,
        Dictionary<string, BarcodeData?> barcodeData)
    {
        // Work on a copy — SpreadsheetDocument.Dispose() can truncate the original stream
        var working = new MemoryStream();
        input.Position = 0;
        input.CopyTo(working);
        working.Position = 0;

        using (var doc = SpreadsheetDocument.Open(working, true))
        {
        var wb = doc.WorkbookPart;
        if (wb == null) { working.Position = 0; return working; }

        foreach (var wsPart in wb.WorksheetParts)
        {
            var dp = wsPart.DrawingsPart;
            if (dp?.WorksheetDrawing == null) continue;

            // Collect shapes to process (can't modify while iterating)
            var replacements = new List<(DocumentFormat.OpenXml.OpenXmlElement anchor, string key, byte[] bytes, int w, int h)>();

            foreach (var anchor in dp.WorksheetDrawing.Elements().ToList())
            {
                var shape = anchor.Descendants<DocumentFormat.OpenXml.Drawing.Spreadsheet.Shape>().FirstOrDefault();
                if (shape?.TextBody == null) continue;

                var text = string.Join("", shape.Descendants()
                    .Where(e => e.LocalName == "t").Select(e => e.InnerText)).Trim();
                if (string.IsNullOrEmpty(text)) continue;

                byte[]? imgBytes = null;
                int w = 200, h = 200;

                var imgMatch = ImageMarkerPattern.Match(text);
                if (imgMatch.Success && text == imgMatch.Value && images.TryGetValue(imgMatch.Groups[1].Value, out imgBytes))
                {
                    var meta = imageData.TryGetValue(imgMatch.Groups[1].Value, out var m) ? m : null;
                    w = meta?.Width ?? 200; h = meta?.Height ?? 200;
                }

                var qrMatch = QrMarkerPattern.Match(text);
                if (imgBytes == null && qrMatch.Success && text == qrMatch.Value && qrCodes.TryGetValue(qrMatch.Groups[1].Value, out imgBytes))
                {
                    var qMeta = qrData.TryGetValue(qrMatch.Groups[1].Value, out var q) ? q : null;
                    var sz = qMeta?.Size ?? 120; w = sz; h = sz;
                }

                var bcMatch = BarcodeMarkerPattern.Match(text);
                if (imgBytes == null && bcMatch.Success && text == bcMatch.Value && barcodes.TryGetValue(bcMatch.Groups[1].Value, out imgBytes))
                {
                    var bMeta = barcodeData.TryGetValue(bcMatch.Groups[1].Value, out var b) ? b : null;
                    (w, h) = ComputeBarcodeRenderSize(imgBytes, bMeta?.Width ?? 200, bMeta?.Height ?? 100);
                }

                if (imgBytes != null)
                    replacements.Add((anchor, text, imgBytes, w, h));
            }

            foreach (var (anchor, _, imgBytes, w, h) in replacements)
            {
                try
                {
                    // Add image part
                    var imagePart = dp.AddImagePart(ImagePartType.Png);
                    using (var ms = new MemoryStream(imgBytes)) imagePart.FeedData(ms);
                    var relId = dp.GetIdOfPart(imagePart);

                    // EMU conversion: 1 pixel ≈ 9525 EMUs
                    long emuW = w * 9525L;
                    long emuH = h * 9525L;

                    // Build a Picture element that references the image
                    var nvPicPr = new DocumentFormat.OpenXml.Drawing.Spreadsheet.NonVisualPictureProperties(
                        new DocumentFormat.OpenXml.Drawing.Spreadsheet.NonVisualDrawingProperties { Id = 1, Name = "Image" },
                        new DocumentFormat.OpenXml.Drawing.Spreadsheet.NonVisualPictureDrawingProperties(
                            new DocumentFormat.OpenXml.Drawing.PictureLocks { NoChangeAspect = true }));
                    var blipFill = new DocumentFormat.OpenXml.Drawing.Spreadsheet.BlipFill(
                        new DocumentFormat.OpenXml.Drawing.Blip { Embed = relId },
                        new DocumentFormat.OpenXml.Drawing.Stretch(new DocumentFormat.OpenXml.Drawing.FillRectangle()));
                    var spPr = new DocumentFormat.OpenXml.Drawing.Spreadsheet.ShapeProperties(
                        new DocumentFormat.OpenXml.Drawing.Transform2D(
                            new DocumentFormat.OpenXml.Drawing.Offset { X = 0, Y = 0 },
                            new DocumentFormat.OpenXml.Drawing.Extents { Cx = emuW, Cy = emuH }),
                        new DocumentFormat.OpenXml.Drawing.PresetGeometry(
                            new DocumentFormat.OpenXml.Drawing.AdjustValueList()) { Preset = DocumentFormat.OpenXml.Drawing.ShapeTypeValues.Rectangle });

                    var pic = new DocumentFormat.OpenXml.Drawing.Spreadsheet.Picture(nvPicPr, blipFill, spPr);

                    // Replace the Shape inside the anchor with the Picture
                    var oldShape = anchor.Descendants<DocumentFormat.OpenXml.Drawing.Spreadsheet.Shape>().First();
                    anchor.InsertBefore(pic, oldShape);
                    oldShape.Remove();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to replace TextBox marker with image");
                }
            }

            if (replacements.Count > 0) dp.WorksheetDrawing.Save();
        }

        doc.Save();
        } // dispose doc

        working.Position = 0;
        return working;
    }

    #endregion

    #region Excel-Specific Features

    private void ApplyExcelFeatures(
        IXLWorksheet worksheet,
        TableData tableData,
        int dataStartRow,
        int dataEndRow,
        int lastCol,
        List<Dictionary<string, object?>> rows)
    {
        if (dataEndRow < dataStartRow) return;

        var featureHeaderRow = dataStartRow > 1 ? dataStartRow - 1 : dataStartRow;
        var featureRange = worksheet.Range(featureHeaderRow, 1, dataEndRow, lastCol);

        // Auto-filter — skip when AsExcelTable is on (table provides its own filter).
        // Also guard against templates that already have a table covering this range.
        if (tableData.AutoFilter && !tableData.AsExcelTable)
        {
            try { featureRange.SetAutoFilter(); }
            catch (InvalidOperationException) { /* range is already part of a table in the template */ }
        }

        // Freeze header
        if (tableData.FreezeHeader)
        {
            worksheet.SheetView.FreezeRows(dataStartRow - 1);
        }

        // Auto-fit columns
        if (tableData.AutoFitColumns)
        {
            worksheet.Columns(1, lastCol).AdjustToContents();
        }

        // Convert to Excel Table — skip if the template already has a table on this range
        if (tableData.AsExcelTable)
        {
            try { featureRange.CreateTable(); }
            catch (InvalidOperationException) { /* range is already a table in the template */ }
        }

        // Generate totals row with formulas
        if (tableData.GenerateTotals != null && tableData.GenerateTotals.Count > 0)
        {
            var totalRow = dataEndRow + 1;
            worksheet.Row(totalRow).InsertRowsAbove(1);

            // Find which column each field is in based on template markers
            for (var col = 1; col <= lastCol; col++)
            {
                foreach (var (field, func) in tableData.GenerateTotals)
                {
                    // Check if this column contained the field in any data row
                    var cellInDataRow = worksheet.Cell(dataStartRow, col);
                    if (HasFieldInColumn(rows, field, col, lastCol))
                    {
                        var colLetter = worksheet.Cell(1, col).Address.ColumnLetter;
                        var formula = func.ToUpperInvariant() switch
                        {
                            "SUM" => $"SUM({colLetter}{dataStartRow}:{colLetter}{dataEndRow})",
                            "AVERAGE" => $"AVERAGE({colLetter}{dataStartRow}:{colLetter}{dataEndRow})",
                            "COUNT" => $"COUNTA({colLetter}{dataStartRow}:{colLetter}{dataEndRow})",
                            "MIN" => $"MIN({colLetter}{dataStartRow}:{colLetter}{dataEndRow})",
                            "MAX" => $"MAX({colLetter}{dataStartRow}:{colLetter}{dataEndRow})",
                            _ => $"SUM({colLetter}{dataStartRow}:{colLetter}{dataEndRow})"
                        };
                        worksheet.Cell(totalRow, col).FormulaA1 = formula;
                        worksheet.Cell(totalRow, col).Style.Font.Bold = true;
                    }
                }
            }
        }

        // Conditional formatting
        if (tableData.ConditionalFormat != null)
        {
            ApplyConditionalFormatting(worksheet, tableData.ConditionalFormat, dataStartRow, dataEndRow, lastCol, rows);
        }
    }

    private void ApplyVerticalMerge(
        IXLWorksheet worksheet,
        int startRow,
        int endRow,
        List<TemplateCellInfo[]> templateRowData,
        List<string> mergeFields,
        int lastCol)
    {
        foreach (var field in mergeFields)
        {
            // Find which column this field corresponds to
            for (var col = 1; col <= lastCol && col <= templateRowData[0].Length; col++)
            {
                var tmplText = templateRowData[0][col - 1].Text;
                if (tmplText.Contains($"{{{{row:{field}}}}}") || tmplText.Contains($"{{{{{field}}}}}"))
                {
                    // Merge identical consecutive values in this column
                    var mergeStart = startRow;
                    for (var row = startRow + 1; row <= endRow + 1; row++)
                    {
                        var currentVal = row <= endRow ? worksheet.Cell(row, col).GetString() : null;
                        var startVal = worksheet.Cell(mergeStart, col).GetString();

                        if (row > endRow || currentVal != startVal)
                        {
                            if (row - 1 > mergeStart)
                            {
                                worksheet.Range(mergeStart, col, row - 1, col).Merge();
                            }
                            mergeStart = row;
                        }
                    }
                    break;
                }
            }
        }
    }

    private void ApplyOutlineGrouping(
        IXLWorksheet worksheet,
        int startRow,
        List<Dictionary<string, object?>> rows,
        string groupField,
        int templateRowCount)
    {
        var currentRow = startRow;
        var groups = rows.GroupBy(r => GetCellValue(r, groupField)?.ToString() ?? "").ToList();

        foreach (var group in groups)
        {
            var groupSize = group.Count() * templateRowCount;
            if (groupSize > 1)
            {
                worksheet.Rows(currentRow + 1, currentRow + groupSize - 1).Group();
            }
            currentRow += groupSize;
        }
    }

    private void ApplyConditionalFormatting(
        IXLWorksheet worksheet,
        List<ConditionalFormatConfig> configs,
        int startRow,
        int endRow,
        int lastCol,
        List<Dictionary<string, object?>> rows)
    {
        foreach (var config in configs)
        {
            // Find column index for this field
            var fieldCol = FindFieldColumn(rows, config.Field, lastCol);
            if (fieldCol <= 0) continue;

            for (var row = startRow; row <= endRow; row++)
            {
                var cell = worksheet.Cell(row, fieldCol);
                var cellValue = cell.GetString();

                foreach (var rule in config.Rules)
                {
                    var matches = false;

                    if (rule.Value != null && rule.Operator == null)
                    {
                        // Exact value match
                        matches = cellValue == rule.Value.ToString();
                    }
                    else if (rule.Operator != null && rule.Value != null)
                    {
                        if (double.TryParse(cellValue, CultureInfo.InvariantCulture, out var numVal) &&
                            double.TryParse(rule.Value.ToString(), CultureInfo.InvariantCulture, out var ruleVal))
                        {
                            matches = rule.Operator.ToLowerInvariant() switch
                            {
                                "greaterthan" => numVal > ruleVal,
                                "lessthan" => numVal < ruleVal,
                                "equal" => Math.Abs(numVal - ruleVal) < 0.0001,
                                "greaterorequal" => numVal >= ruleVal,
                                "lessorequal" => numVal <= ruleVal,
                                _ => false
                            };
                        }
                    }

                    if (matches)
                    {
                        if (rule.FontColor != null) cell.Style.Font.FontColor = XLColor.FromHtml(rule.FontColor);
                        if (rule.BackgroundColor != null) cell.Style.Fill.BackgroundColor = XLColor.FromHtml(rule.BackgroundColor);
                        if (rule.Bold == true) cell.Style.Font.Bold = true;
                        if (rule.Italic == true) cell.Style.Font.Italic = true;
                        break; // First matching rule wins
                    }
                }
            }
        }
    }

    #endregion

    #region Marker Replacement Helpers

    private static string ReplaceRowMarkers(string text, Dictionary<string, object?> rowData)
    {
        // Replace {{row:key}} markers
        text = RowMarkerPattern.Replace(text, match =>
        {
            var key = match.Groups[1].Value;
            return GetCellValue(rowData, key)?.ToString() ?? "";
        });

        // Also replace {{key}} (legacy shorthand)
        text = VariableMarkerPattern.Replace(text, match =>
        {
            var key = match.Groups[1].Value;
            // Only replace if key exists in row data and is not a special marker
            if (rowData.ContainsKey(key))
            {
                return GetCellValue(rowData, key)?.ToString() ?? "";
            }
            return match.Value; // Leave unchanged
        });

        return text;
    }

    private static string ReplaceRowAggregates(string text, Dictionary<string, object?> rowData)
    {
        return RowAggregatePattern.Replace(text, match =>
        {
            var func = match.Groups[1].Value; // row_sum or row_avg
            var fields = match.Groups[2].Value.Split(',').Select(f => f.Trim()).ToArray();

            var values = fields
                .Select(f => GetNumericValue(rowData, f))
                .Where(v => v.HasValue)
                .Select(v => v!.Value)
                .ToList();

            if (values.Count == 0) return "0";

            return func switch
            {
                "row_sum" => values.Sum().ToString(CultureInfo.InvariantCulture),
                "row_avg" => values.Average().ToString(CultureInfo.InvariantCulture),
                _ => "0"
            };
        });
    }

    private static string ReplaceGroupAggregates(string text, List<Dictionary<string, object?>> groupRows)
    {
        text = text.Replace("{{group_count}}", groupRows.Count.ToString());

        return GroupAggregatePattern.Replace(text, match =>
        {
            var func = match.Groups[1].Value;
            var fieldsStr = match.Groups[2].Value;

            if (func == "group_count") return groupRows.Count.ToString();

            var fields = fieldsStr.Split(',').Select(f => f.Trim()).ToArray();
            var results = new List<string>();

            foreach (var field in fields)
            {
                var values = groupRows
                    .Select(r => GetNumericValue(r, field))
                    .Where(v => v.HasValue)
                    .Select(v => v!.Value)
                    .ToList();

                if (values.Count == 0) { results.Add("0"); continue; }

                var result = func switch
                {
                    "group_sum" => values.Sum(),
                    "group_avg" => values.Average(),
                    "group_min" => values.Min(),
                    "group_max" => values.Max(),
                    _ => 0.0
                };
                results.Add(result.ToString(CultureInfo.InvariantCulture));
            }

            return string.Join(",", results);
        });
    }

    private static string ReplaceTableAggregates(string text, List<Dictionary<string, object?>> allRows)
    {
        text = text.Replace("{{table_count}}", allRows.Count.ToString());

        return TableAggregatePattern.Replace(text, match =>
        {
            var func = match.Groups[1].Value;
            var fieldsStr = match.Groups[2].Value;

            if (func == "table_count") return allRows.Count.ToString();

            var fields = fieldsStr.Split(',').Select(f => f.Trim()).ToArray();
            var results = new List<string>();

            foreach (var field in fields)
            {
                var values = allRows
                    .Select(r => GetNumericValue(r, field))
                    .Where(v => v.HasValue)
                    .Select(v => v!.Value)
                    .ToList();

                if (values.Count == 0) { results.Add("0"); continue; }

                var result = func switch
                {
                    "table_sum" => values.Sum(),
                    "table_avg" => values.Average(),
                    "table_min" => values.Min(),
                    "table_max" => values.Max(),
                    _ => 0.0
                };
                results.Add(result.ToString(CultureInfo.InvariantCulture));
            }

            return string.Join(",", results);
        });
    }

    #endregion

    #region Resource Preloading

    private async Task<Dictionary<string, byte[]>> PreloadImagesAsync(
        Dictionary<string, ImageData?> imageData,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, byte[]>();
        if (imageData.Count == 0) return result;

        var tasks = imageData
            .Where(kvp => kvp.Value != null && !string.IsNullOrEmpty(kvp.Value.Src))
            .Select(async kvp =>
            {
                var bytes = await LoadImageBytesAsync(kvp.Value!.Src, cancellationToken);
                return (kvp.Key, bytes);
            });

        foreach (var (key, bytes) in await Task.WhenAll(tasks))
        {
            if (bytes != null) result[key] = bytes;
        }

        return result;
    }

    private Task<Dictionary<string, byte[]>> PreloadQrCodesAsync(
        Dictionary<string, QrCodeData?> qrData,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, byte[]>();
        if (qrData.Count == 0) return Task.FromResult(result);

        foreach (var (key, data) in qrData)
        {
            if (data == null || string.IsNullOrEmpty(data.Text)) continue;
            var options = new QrCodeOptions
            {
                Size = data.Size,
                Color = data.Color ?? "#000000",
                BackgroundColor = data.BackgroundColor ?? "#FFFFFF"
            };
            var bytes = _qrCodeService.GenerateQrCode(data.Text, options);
            result[key] = bytes;
        }

        return Task.FromResult(result);
    }

    private Task<Dictionary<string, byte[]>> PreloadBarcodesAsync(
        Dictionary<string, BarcodeData?> barcodeData,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, byte[]>();
        if (barcodeData.Count == 0) return Task.FromResult(result);

        foreach (var (key, data) in barcodeData)
        {
            if (data == null || string.IsNullOrEmpty(data.Text)) continue;
            var options = new BarcodeOptions
            {
                Format = data.Format,
                Width = data.Width,
                Height = data.Height,
                IncludeText = data.IncludeText,
                Color = data.Color,
                BackgroundColor = data.BackgroundColor
            };
            var bytes = _barcodeService.GenerateBarcode(data.Text, options);
            result[key] = bytes;
        }

        return Task.FromResult(result);
    }

    private async Task<byte[]?> LoadImageBytesAsync(string src, CancellationToken cancellationToken)
    {
        try
        {
            if (src.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                // Base64 data URI
                var commaIndex = src.IndexOf(',');
                if (commaIndex >= 0)
                {
                    return Convert.FromBase64String(src[(commaIndex + 1)..]);
                }
            }
            else if (src.StartsWith("minio:", StringComparison.OrdinalIgnoreCase))
            {
                var parts = src[6..].Split('/', 2);
                if (parts.Length == 2)
                {
                    using var stream = await _storageService.DownloadFileAsync(parts[0], parts[1]);
                    using var ms = new MemoryStream();
                    await stream.CopyToAsync(ms, cancellationToken);
                    return ms.ToArray();
                }
            }
            else if (src.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                var client = _httpClientFactory.CreateClient();
                return await client.GetByteArrayAsync(src, cancellationToken);
            }
            else
            {
                // Try as raw base64
                return Convert.FromBase64String(src);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load image from source: {Src}", src.Length > 50 ? src[..50] + "..." : src);
        }

        return null;
    }

    #endregion

    #region Utility Methods

    private static object? GetCellValue(Dictionary<string, object?> row, string key)
    {
        return row.TryGetValue(key, out var value) ? value : null;
    }

    private static double? GetNumericValue(Dictionary<string, object?> row, string key)
    {
        var value = GetCellValue(row, key);
        if (value == null) return null;

        if (value is double d) return d;
        if (value is int i) return i;
        if (value is long l) return l;
        if (value is decimal dec) return (double)dec;
        if (double.TryParse(value.ToString(), CultureInfo.InvariantCulture, out var parsed)) return parsed;

        return null;
    }

    /// <summary>
    /// Sets cell value with type detection when the marker is the entire cell content
    /// </summary>
    private static void SetCellValueSmart(IXLCell cell, string text, string originalTemplate)
    {
        // If the original template was a single marker and the result is a pure value, preserve type
        var isSingleMarker = originalTemplate.StartsWith("{{") && originalTemplate.EndsWith("}}") &&
                             originalTemplate.IndexOf("{{", 2) == -1;

        if (isSingleMarker)
        {
            // Try to set as typed value
            if (double.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out var numVal))
            {
                cell.Value = numVal;
                return;
            }

            if (DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateVal))
            {
                cell.Value = dateVal;
                return;
            }

            if (bool.TryParse(text, out var boolVal))
            {
                cell.Value = boolVal;
                return;
            }
        }

        cell.Value = text;
    }

    private static string GetRowText(IXLWorksheet worksheet, int row, int lastCol)
    {
        var texts = new List<string>();
        for (var col = 1; col <= lastCol; col++)
        {
            texts.Add(worksheet.Cell(row, col).GetString());
        }
        return string.Join(" ", texts);
    }

    private List<TemplateCellInfo[]> CaptureRowTemplates(IXLWorksheet worksheet, int startRow, int endRow, int lastCol)
    {
        var templates = new List<TemplateCellInfo[]>();
        if (startRow <= 0 || endRow <= 0) return templates;

        for (var r = startRow; r <= endRow; r++)
        {
            var cells = new TemplateCellInfo[lastCol];
            for (var col = 1; col <= lastCol; col++)
            {
                var cell = worksheet.Cell(r, col);
                cells[col - 1] = new TemplateCellInfo
                {
                    Text = cell.GetString(),
                    Style = cell.Style,
                    HasFormula = cell.HasFormula,
                    FormulaA1 = cell.HasFormula ? cell.FormulaA1 : null,
                    DataType = cell.DataType
                };
            }
            templates.Add(cells);
        }

        return templates;
    }

    private static void DeleteRegionRows(IXLWorksheet worksheet, TableRegion region)
    {
        var from = region.HeaderRowStart > 0 ? region.HeaderRowStart : region.TemplateRowStart;
        var to = region.FooterRowEnd > 0 ? region.FooterRowEnd : region.TemplateRowEnd;
        worksheet.Rows(from, to).Delete();
    }

    private static List<Dictionary<string, object?>> SortRows(
        List<Dictionary<string, object?>> rows,
        List<SortDefinition> sortDefs)
    {
        IOrderedEnumerable<Dictionary<string, object?>>? ordered = null;

        foreach (var sort in sortDefs)
        {
            var field = sort.Field;
            var desc = sort.Direction?.ToLowerInvariant() == "desc";

            if (ordered == null)
            {
                ordered = desc
                    ? rows.OrderByDescending(r => GetCellValue(r, field)?.ToString() ?? "")
                    : rows.OrderBy(r => GetCellValue(r, field)?.ToString() ?? "");
            }
            else
            {
                ordered = desc
                    ? ordered.ThenByDescending(r => GetCellValue(r, field)?.ToString() ?? "")
                    : ordered.ThenBy(r => GetCellValue(r, field)?.ToString() ?? "");
            }
        }

        return ordered?.ToList() ?? rows;
    }

    private static List<Dictionary<string, object?>> CollapseRows(
        List<Dictionary<string, object?>> rows,
        List<string> collapseFields)
    {
        var groups = rows.GroupBy(r =>
            string.Join("|", collapseFields.Select(f => GetCellValue(r, f)?.ToString() ?? "")));

        var result = new List<Dictionary<string, object?>>();
        foreach (var group in groups)
        {
            var firstRow = new Dictionary<string, object?>(group.First());
            var otherRows = group.Skip(1).ToList();

            // Sum numeric fields
            foreach (var key in firstRow.Keys.ToList())
            {
                if (collapseFields.Contains(key)) continue;

                var numVal = GetNumericValue(firstRow, key);
                if (numVal.HasValue)
                {
                    var sum = numVal.Value + otherRows.Sum(r => GetNumericValue(r, key) ?? 0);
                    firstRow[key] = sum;
                }
            }

            result.Add(firstRow);
        }

        return result;
    }

    private static bool HasFieldInColumn(List<Dictionary<string, object?>> rows, string field, int col, int lastCol)
    {
        // Simple heuristic: field at column position matches if it's within range
        if (rows.Count == 0) return false;
        var keys = rows[0].Keys.ToList();
        var fieldIndex = keys.IndexOf(field);
        return fieldIndex >= 0 && fieldIndex + 1 == col;
    }

    private static int FindFieldColumn(List<Dictionary<string, object?>> rows, string field, int lastCol)
    {
        if (rows.Count == 0) return -1;
        var keys = rows[0].Keys.ToList();
        var index = keys.IndexOf(field);
        return index >= 0 ? index + 1 : -1;
    }

    #endregion

    #region Internal Types

    private class TableRegion
    {
        public int HeaderRowStart { get; set; }
        public int HeaderRowEnd { get; set; }
        public int TemplateRowStart { get; set; }
        public int TemplateRowEnd { get; set; }
        public int FooterRowStart { get; set; }
        public int FooterRowEnd { get; set; }
        public int LastColumn { get; set; }
    }

    private class TemplateCellInfo
    {
        public string Text { get; set; } = string.Empty;
        public IXLStyle Style { get; set; } = null!;
        public bool HasFormula { get; set; }
        public string? FormulaA1 { get; set; }
        public XLDataType DataType { get; set; }
    }

    #endregion
}
