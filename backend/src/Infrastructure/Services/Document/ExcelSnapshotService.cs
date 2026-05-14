using ClosedXML.Excel;
using ClosedXML.Graphics;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;
using SkiaSharp;

namespace QorstackReportService.Infrastructure.Services.Document;

/// <summary>
/// Renders the first worksheet of an Excel file to a PNG image with visible gridlines.
/// Uses ClosedXML to read cell data and SkiaSharp to paint a faithful spreadsheet snapshot.
/// The output is sized to fit the Used Range only — no blank whitespace.
/// </summary>
public class ExcelSnapshotService : IExcelSnapshotService
{
    private const int CellPaddingX = 8;
    private const int CellPaddingY = 6;
    private const int DefaultColWidth = 100;
    private const int DefaultRowHeight = 24;
    private const int HeaderHeight = 24;
    private const int RowNumberWidth = 40;
    // Thumbnail limits (dashboard cards — compact)
    private const int ThumbnailMaxRows = 20;
    private const int ThumbnailMaxCols = 10;
    private const int ThumbnailMaxWidth = 800;
    private const int ThumbnailMaxHeight = 600;

    // Full preview limits (builder page — show everything useful)
    private const int FullMaxRows = 200;
    private const int FullMaxCols = 30;
    private const int FullMaxWidth = 3000;
    private const int FullMaxHeight = 8000;
    private const float FontSize = 12f;
    private const float HeaderFontSize = 11f;

    // Colors
    private static readonly SKColor GridlineColor = new(0xE0, 0xE0, 0xE0);        // light gray gridlines
    private static readonly SKColor HeaderBgColor = new(0xF3, 0xF3, 0xF3);        // header background
    private static readonly SKColor HeaderTextColor = new(0x55, 0x55, 0x55);       // header text
    private static readonly SKColor CellTextColor = new(0x1A, 0x1A, 0x1A);         // cell text
    private static readonly SKColor WhiteBg = SKColors.White;

    private readonly ILogger<ExcelSnapshotService> _logger;

    public ExcelSnapshotService(ILogger<ExcelSnapshotService> logger)
    {
        _logger = logger;
    }

    public byte[] RenderThumbnail(Stream excelStream, int quality = 90) =>
        RenderCore(excelStream, ThumbnailMaxRows, ThumbnailMaxCols, ThumbnailMaxWidth, ThumbnailMaxHeight, quality);

    public byte[] RenderFullPreview(Stream excelStream, int quality = 90) =>
        RenderCore(excelStream, FullMaxRows, FullMaxCols, FullMaxWidth, FullMaxHeight, quality);

    private byte[] RenderCore(Stream excelStream, int maxRows, int maxCols, int maxImageW, int maxImageH, int quality)
    {
        excelStream.Position = 0;

        XLWorkbook workbook;
        try
        {
            var loadOptions = new LoadOptions { GraphicEngine = new DefaultGraphicEngine("Carlito") };
            workbook = new XLWorkbook(excelStream, loadOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to open Excel for snapshot, returning empty image");
            return RenderPlaceholder();
        }

        using var _ = workbook;
        var ws = workbook.Worksheets.First();

        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;
        var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 1;

        lastRow = Math.Min(lastRow, maxRows);
        lastCol = Math.Min(lastCol, maxCols);

        // Measure columns
        var colWidths = new int[lastCol];
        for (int c = 0; c < lastCol; c++)
        {
            var xlCol = ws.Column(c + 1);
            var w = xlCol.Width;
            colWidths[c] = w > 0 ? (int)(w * 8) : DefaultColWidth; // Excel width unit ≈ 8px
            colWidths[c] = Math.Clamp(colWidths[c], 40, 300);
        }

        // Measure rows
        var rowHeights = new int[lastRow];
        for (int r = 0; r < lastRow; r++)
        {
            var xlRow = ws.Row(r + 1);
            var h = xlRow.Height;
            rowHeights[r] = h > 0 ? (int)(h * 1.33) : DefaultRowHeight;
            rowHeights[r] = Math.Clamp(rowHeights[r], 20, 80);
        }

        // Calculate total size
        var totalWidth = RowNumberWidth + colWidths.Sum();
        var totalHeight = HeaderHeight + rowHeights.Sum();

        // Clamp image dimensions
        totalWidth = Math.Min(totalWidth, maxImageW);
        totalHeight = Math.Min(totalHeight, maxImageH);

        var info = new SKImageInfo(totalWidth, totalHeight);
        using var surface = SKSurface.Create(info);
        var canvas = surface.Canvas;
        canvas.Clear(WhiteBg);

        // Paints + Fonts (SkiaSharp v3 uses SKFont for text measurement/drawing)
        using var gridPaint = new SKPaint { Color = GridlineColor, StrokeWidth = 1, IsAntialias = false, Style = SKPaintStyle.Stroke };
        using var headerBgPaint = new SKPaint { Color = HeaderBgColor, Style = SKPaintStyle.Fill };
        using var headerTextPaint = new SKPaint { Color = HeaderTextColor, IsAntialias = true };
        using var headerFont = new SKFont { Size = HeaderFontSize };
        using var cellTextPaint = new SKPaint { Color = CellTextColor, IsAntialias = true };
        using var cellFont = new SKFont { Size = FontSize };
        using var boldTextPaint = new SKPaint { Color = CellTextColor, IsAntialias = true };
        using var boldFont = new SKFont { Size = FontSize, Embolden = true };

        // Draw column headers (A, B, C, ...)
        canvas.DrawRect(0, 0, totalWidth, HeaderHeight, headerBgPaint);
        canvas.DrawRect(0, 0, RowNumberWidth, HeaderHeight, headerBgPaint);

        var x = RowNumberWidth;
        for (int c = 0; c < lastCol && x < totalWidth; c++)
        {
            var colLabel = GetColumnLetter(c + 1);
            var textWidth = headerFont.MeasureText(colLabel);
            canvas.DrawText(colLabel, x + (colWidths[c] - textWidth) / 2, HeaderHeight - 7, SKTextAlign.Left, headerFont, headerTextPaint);
            x += colWidths[c];
        }

        // Draw row numbers + cells
        var y = HeaderHeight;
        for (int r = 0; r < lastRow && y < totalHeight; r++)
        {
            // Row number background
            canvas.DrawRect(0, y, RowNumberWidth, rowHeights[r], headerBgPaint);
            var rowLabel = (r + 1).ToString();
            var rowLabelW = headerFont.MeasureText(rowLabel);
            canvas.DrawText(rowLabel, (RowNumberWidth - rowLabelW) / 2, y + rowHeights[r] - 7, SKTextAlign.Left, headerFont, headerTextPaint);

            x = RowNumberWidth;
            for (int c = 0; c < lastCol && x < totalWidth; c++)
            {
                var cell = ws.Cell(r + 1, c + 1);
                var value = cell.GetFormattedString();

                if (!string.IsNullOrEmpty(value))
                {
                    // Check cell formatting
                    var isBold = cell.Style.Font.Bold;
                    var activePaint = isBold ? boldTextPaint : cellTextPaint;
                    var activeFont = isBold ? boldFont : cellFont;
                    var ownsClone = false;

                    // Cell fill color
                    var fillColor = cell.Style.Fill.BackgroundColor;
                    if (fillColor.ColorType != XLColorType.Theme || fillColor.ThemeColor != XLThemeColor.Background1)
                    {
                        try
                        {
                            var clr = fillColor.Color;
                            if (clr.A > 0 && clr != System.Drawing.Color.White && clr != System.Drawing.Color.Black)
                            {
                                using var fillPaint = new SKPaint
                                {
                                    Color = new SKColor(clr.R, clr.G, clr.B, clr.A),
                                    Style = SKPaintStyle.Fill
                                };
                                canvas.DrawRect(x, y, colWidths[c], rowHeights[r], fillPaint);
                            }
                        }
                        catch { /* some theme colors can't resolve — skip */ }
                    }

                    // Font color
                    var fontColorStyle = cell.Style.Font.FontColor;
                    try
                    {
                        if (fontColorStyle.ColorType == XLColorType.Color)
                        {
                            var fc = fontColorStyle.Color;
                            activePaint = activePaint.Clone();
                            activePaint.Color = new SKColor(fc.R, fc.G, fc.B);
                            ownsClone = true;
                        }
                    }
                    catch { /* theme color fallback */ }

                    // Truncate text to fit column
                    var maxTextW = colWidths[c] - CellPaddingX * 2;
                    var displayText = value;
                    while (activeFont.MeasureText(displayText) > maxTextW && displayText.Length > 1)
                        displayText = displayText[..^1];
                    if (displayText.Length < value.Length && displayText.Length > 0)
                        displayText = displayText[..^1] + "…";

                    canvas.DrawText(displayText, x + CellPaddingX, y + rowHeights[r] - CellPaddingY, SKTextAlign.Left, activeFont, activePaint);

                    if (ownsClone) activePaint.Dispose();
                }

                x += colWidths[c];
            }

            y += rowHeights[r];
        }

        // Draw gridlines on top
        // Horizontal lines
        y = HeaderHeight;
        canvas.DrawLine(0, y, totalWidth, y, gridPaint);
        for (int r = 0; r < lastRow && y < totalHeight; r++)
        {
            y += rowHeights[r];
            canvas.DrawLine(0, y, totalWidth, y, gridPaint);
        }

        // Vertical lines
        x = 0;
        canvas.DrawLine(x, 0, x, totalHeight, gridPaint);
        x = RowNumberWidth;
        canvas.DrawLine(x, 0, x, totalHeight, gridPaint);
        for (int c = 0; c < lastCol && x < totalWidth; c++)
        {
            x += colWidths[c];
            canvas.DrawLine(x, 0, x, totalHeight, gridPaint);
        }

        // Outer border
        canvas.DrawRect(0, 0, totalWidth - 1, totalHeight - 1, gridPaint);

        // Encode
        using var image = surface.Snapshot();
        using var data = image.Encode(SKEncodedImageFormat.Png, quality);
        var bytes = data.ToArray();

        _logger.LogInformation("[ExcelSnapshot] Rendered {Cols}x{Rows} → {Width}x{Height}px ({Size} bytes)",
            lastCol, lastRow, totalWidth, totalHeight, bytes.Length);

        return bytes;
    }

    private static byte[] RenderPlaceholder()
    {
        var info = new SKImageInfo(400, 300);
        using var surface = SKSurface.Create(info);
        surface.Canvas.Clear(new SKColor(0xF5, 0xF5, 0xF5));
        using var paint = new SKPaint { Color = new SKColor(0x99, 0x99, 0x99), IsAntialias = true };
        using var font = new SKFont { Size = 16 };
        surface.Canvas.DrawText("Preview not available", 80, 155, SKTextAlign.Left, font, paint);
        using var img = surface.Snapshot();
        using var data = img.Encode(SKEncodedImageFormat.Png, 80);
        return data.ToArray();
    }

    private static string GetColumnLetter(int col)
    {
        var result = "";
        while (col > 0)
        {
            col--;
            result = (char)('A' + col % 26) + result;
            col /= 26;
        }
        return result;
    }
}
