using System.Xml.Linq;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;

namespace QorstackReportService.Application.Common.Helpers;

/// <summary>
/// Adds thin gray gridline borders to fill an Excel sheet before PDF conversion.
/// Grid covers max(A4 portrait, data extent). Styled cells and Excel-Table cells are
/// left untouched so fill/font colours are preserved. FitToPage ensures 1-page output.
/// </summary>
public static class ExcelGridlineHelper
{
    // ╔══════════════════════════════════════════════════════════════════════╗
    // ║  CONFIG — change values here to adjust the preview appearance      ║
    // ╚══════════════════════════════════════════════════════════════════════╝

    // ── Grid ────────────────────────────────────────────────────────────────
    private const string GridColor  = "FFD0D0D0";     // gridline border color (ARGB 8-char hex)
    private const uint   MinGridRows = 35;             // minimum rows in preview (increase = taller)
    private const double A4W        = 595.0;           // A4 portrait width in points
    private const double DefColW    = 8.43 * 7.0;     // default column width in points (~59pt)
    private const double DefRowH    = 15.0;            // default row height in points

    // ── Axis headers (row numbers + column letters) ─────────────────────────
    // All colors use 8-char ARGB format (FF = fully opaque)
    private const string AxisBgColor     = "FFF3F3F3"; // header background
    private const string AxisCornerColor = "FFE4E4E7"; // corner cell (A1) background
    private const string AxisBorderColor = "FFC0C0C0"; // header border color
    private const string AxisFontColor   = "FF808080"; // header text color (gray)
    private const string AxisFontName    = "Arial";    // sans-serif font (no serifs)
    private const double AxisFontSize   = 9;           // header font size (pt)
    private const double AxisColWidth   = 4;           // column-A width for row numbers (chars)
    private const double AxisRowHeight  = 18;          // row-1 height for column letters (pt)
    private const double MarginLeft     = 0.15;        // left margin (inches) for row headers
    private const double MarginTop      = 0.1;         // top margin (inches) for col headers

    public static MemoryStream AddGridlineBorders(Stream input)
    {
        var ms = new MemoryStream();
        input.Position = 0;
        input.CopyTo(ms);
        ms.Position = 0;

        using (var doc = SpreadsheetDocument.Open(ms, true))
        {
            var wb = doc.WorkbookPart;
            if (wb?.WorkbookStylesPart?.Stylesheet == null) { ms.Position = 0; return ms; }
            var ss = wb.WorkbookStylesPart.Stylesheet;
            var borderId = AddBorder(ss);
            var themeColors = ReadThemeColors(wb);

            foreach (var wsp in wb.WorksheetParts)
            {
                var ws = wsp.Worksheet;
                var sd = ws.GetFirstChild<SheetData>();
                if (sd == null) continue;

                // Data extent
                uint dR = 0, dC = 0;
                foreach (var row in sd.Elements<Row>())
                {
                    var ri = row.RowIndex?.Value ?? 0;
                    if (ri > dR) dR = ri;
                    foreach (var c in row.Elements<Cell>())
                    { var ci = CI(c.CellReference?.Value); if (ci > dC) dC = ci; }
                }

                var colsDef = ws.GetFirstChild<Columns>();

                // Fill up to A4 portrait width × height (or data extent, whichever is larger)
                double w = 0; uint fC = 0;
                while (w < A4W || fC < dC) { fC++; w += ColW(colsDef, fC); }

                var rHMap = new Dictionary<uint, double>();
                foreach (var row in sd.Elements<Row>())
                    if (row.RowIndex?.Value is > 0 and var ri2 && row.CustomHeight?.Value == true && row.Height?.Value is > 0 and var h2)
                        rHMap[ri2] = h2;
                // Fill at least MinGridRows rows, or data extent — whichever is larger.
                // (Column loop still ensures A4-width coverage horizontally.)
                uint fR = Math.Max(dR, MinGridRows);

                // Index rows
                var rm = new Dictionary<uint, Row>();
                foreach (var row in sd.Elements<Row>())
                { var ri = row.RowIndex?.Value ?? 0; if (ri > 0) rm[ri] = row; }

                // Collect cells with REAL visual styling (visible border or explicit fill)
                var styledCells = new HashSet<(uint r, uint c)>();
                foreach (var row in sd.Elements<Row>())
                {
                    var ri = row.RowIndex?.Value ?? 0;
                    foreach (var cell in row.Elements<Cell>())
                    {
                        if (HB(cell, ss) || HF(cell, ss))
                            styledCells.Add((ri, CI(cell.CellReference?.Value)));
                    }
                }

                // Excel Table cells inherit fill/font from the table style — NOT from explicit
                // cell formats. HB/HF therefore return false for them, so our border writer
                // would clobber those styles with FillId=0/FontId=0. Mark the whole table range
                // as styled so every cell in it is skipped.
                //
                // Additionally, for Dark / Medium built-in styles we write explicit white font
                // on header and total rows — LibreOffice often renders fills from table style
                // correctly but ignores the font colour, so without this the text is invisible.
                var whiteFontCache = new Dictionary<uint, uint>(); // origStyleIdx → new styleIdx

                uint GetWhiteFontStyle(uint origSi)
                {
                    if (whiteFontCache.TryGetValue(origSi, out var hit)) return hit;
                    var fonts = ss.Fonts ??= new DocumentFormat.OpenXml.Spreadsheet.Fonts();
                    var fmts = ss.CellFormats ??= new CellFormats();
                    var o = fmts.Elements<CellFormat>().ElementAtOrDefault((int)origSi);
                    var origFontId = o?.FontId?.Value ?? 0;

                    // Clone the original font and change only the color to white.
                    // This preserves font name, size, bold, italic, etc.
                    var origFont = fonts.Elements<Font>().ElementAtOrDefault((int)origFontId);
                    Font wf;
                    if (origFont != null)
                    {
                        wf = (Font)origFont.CloneNode(true);
                        var existingColor = wf.GetFirstChild<Color>();
                        if (existingColor != null) wf.RemoveChild(existingColor);
                    }
                    else
                    {
                        wf = new Font();
                    }
                    wf.Append(new Color { Rgb = new HexBinaryValue("FFFFFFFF") });
                    fonts.Append(wf);
                    var wFontId = (uint)(fonts.Elements<Font>().Count() - 1);
                    fonts.Count = (uint)fonts.Elements<Font>().Count();

                    var nf = new CellFormat
                    {
                        FontId = wFontId, ApplyFont = true,
                        FillId = o?.FillId?.Value ?? 0, ApplyFill = o?.ApplyFill ?? false,
                        BorderId = o?.BorderId?.Value ?? 0, ApplyBorder = o?.ApplyBorder ?? false,
                        NumberFormatId = o?.NumberFormatId?.Value ?? 0,
                    };
                    if (o?.Alignment != null) nf.Alignment = (Alignment)o.Alignment.CloneNode(true);
                    fmts.Append(nf);
                    var idx = (uint)(fmts.Elements<CellFormat>().Count() - 1);
                    fmts.Count = (uint)fmts.Elements<CellFormat>().Count();
                    return whiteFontCache[origSi] = idx;
                }

                foreach (var tableDefPart in wsp.TableDefinitionParts)
                {
                    var table = tableDefPart.Table;
                    var reference = table?.Reference?.Value;
                    if (string.IsNullOrEmpty(reference)) continue;

                    AddRangeCells(reference, styledCells);

                    var rp = reference.Split(':');
                    if (rp.Length != 2) continue;
                    var cMin = CI(rp[0]); var rMin = RN(rp[0]);
                    var cMax = CI(rp[1]); var rMax = RN(rp[1]);

                    bool hasHeader = !(table!.HeaderRowCount?.HasValue == true && table.HeaderRowCount.Value == 0);
                    bool hasTotals = table.TotalsRowCount?.Value > 0;

                    void ApplyWhiteRow(uint targetRow)
                    {
                        if (!rm.TryGetValue(targetRow, out var row)) return;
                        var cellMap = new Dictionary<uint, Cell>();
                        foreach (var c in row.Elements<Cell>())
                        { var ci = CI(c.CellReference?.Value); if (ci > 0) cellMap[ci] = c; }
                        for (var c = cMin; c <= cMax; c++)
                        {
                            if (!cellMap.TryGetValue(c, out var cell)) continue;
                            var origSi = cell.StyleIndex?.Value ?? 0;
                            // Skip cells whose font already has a custom color override
                            // (e.g. user set "NO" header to red text — don't clobber it to white).
                            if (HasCustomFontColor(origSi, ss)) continue;
                            cell.StyleIndex = GetWhiteFontStyle(origSi);
                        }
                    }

                    // Apply explicit white font to header/total rows for Dark and Medium styles
                    var styleName = table.TableStyleInfo?.Name?.Value ?? "";
                    bool needsWhiteFont = styleName.StartsWith("TableStyleDark", StringComparison.OrdinalIgnoreCase)
                                      || styleName.StartsWith("TableStyleMedium", StringComparison.OrdinalIgnoreCase);
                    if (needsWhiteFont)
                    {
                        if (hasHeader) ApplyWhiteRow(rMin);
                        if (hasTotals) ApplyWhiteRow(rMax);
                    }

                    // Bake explicit band-row fills — LibreOffice ignores table-style DXF band fills
                    // during PDF conversion and renders them white.
                    //
                    // Priority for the accent color:
                    //   1. Theme color via GetStyleParams (matches the actual table style)
                    //   2. Header cell explicit fill (fallback when theme is unavailable)
                    //   3. Hardcoded default Office theme palette
                    //
                    // Cells that already have an explicit fill override are left untouched.
                    bool showStripes = table.TableStyleInfo?.ShowRowStripes?.Value == true;
                    var bandParams = showStripes ? GetBandParams(styleName) : null;
                    if (bandParams != null)
                    {
                        var (themeIdx, bandTint) = bandParams.Value;

                        // 1. Theme color (PRIMARY — exact match for the table style)
                        themeColors.TryGetValue(themeIdx, out string? accentHex);

                        // 2. Hardcoded default Office theme palette
                        accentHex ??= themeIdx switch
                        {
                            0 => "000000", 1 => "FFFFFF",
                            4 => "4472C4", 5 => "ED7D31", 6 => "A5A5A5",
                            7 => "FFC000", 8 => "5B9BD5", 9 => "70AD47",
                            _ => "4472C4"
                        };

                        // 3. Header cell fill (last resort for unknown/custom styles)
                        if (accentHex == null && hasHeader && rm.TryGetValue(rMin, out var headerRow))
                        {
                            foreach (var hc in headerRow.Elements<Cell>())
                            {
                                var hci = CI(hc.CellReference?.Value);
                                if (hci <= cMin || hci > cMax) continue;
                                accentHex = GetCellFillHex(hc, ss, themeColors);
                                if (accentHex != null) break;
                            }
                        }
                        accentHex ??= "4472C4"; // absolute fallback

                        var bandHex = bandTint != 0 ? ApplyTintToHex(accentHex, bandTint) : accentHex;
                        var fillId = GetOrAddSolidFill(ss, bandHex);
                        var bandStyleCache = new Dictionary<uint, uint>();

                        var dataRowStart = hasHeader ? rMin + 1 : rMin;
                        var dataRowEnd   = hasTotals ? rMax - 1 : rMax;

                        // Band counter resets at each group header so each group's
                        // first data row always gets the band fill, matching Excel behavior.
                        int bandIdx = 0;
                        for (var br = dataRowStart; br <= dataRowEnd; br++)
                        {
                            if (!rm.TryGetValue(br, out var dataRow))
                            {
                                dataRow = new Row { RowIndex = br };
                                IR(sd, dataRow);
                                rm[br] = dataRow;
                            }

                            // Detect group-header rows: any cell in the table range
                            // that already has an explicit fill → treat as styled row,
                            // reset band counter and skip.
                            bool isStyledRow = false;
                            foreach (var c in dataRow.Elements<Cell>())
                            {
                                var cci = CI(c.CellReference?.Value);
                                if (cci >= cMin && cci <= cMax && HF(c, ss))
                                { isStyledRow = true; break; }
                            }
                            if (isStyledRow) { bandIdx = 0; continue; }

                            // Only odd data rows (0, 2, 4 …) within each group get the fill
                            if (bandIdx % 2 != 0) { bandIdx++; continue; }
                            bandIdx++;

                            var cellMap2 = new Dictionary<uint, Cell>();
                            foreach (var c in dataRow.Elements<Cell>())
                            { var ci2 = CI(c.CellReference?.Value); if (ci2 > 0) cellMap2[ci2] = c; }

                            for (var bc = cMin; bc <= cMax; bc++)
                            {
                                if (cellMap2.TryGetValue(bc, out var cell))
                                {
                                    if (HF(cell, ss)) continue;
                                    var origSi = cell.StyleIndex?.Value ?? 0;
                                    cell.StyleIndex = GetOrAddBandStyle(ss, origSi, fillId, bandStyleCache);
                                }
                                else
                                {
                                    var newCell = new Cell
                                    {
                                        CellReference = CR(bc, br),
                                        StyleIndex    = GetOrAddBandStyle(ss, 0, fillId, bandStyleCache)
                                    };
                                    IC(dataRow, newCell);
                                }
                            }
                        }
                    }
                }

                // ── Grid border helpers ──────────────────────────────────────────
                // GetBorderId: returns a Border *index* (partial or full).
                // ApplyGridBorder: clones the original CellFormat, swaps in the border,
                //   and PRESERVES FontId / FillId / NumberFormatId / Alignment.
                var partialBorderCache = new Dictionary<string, uint>();

                uint GetBorderId(uint r, uint c)
                {
                    bool skipL = styledCells.Contains((r, c - 1));
                    bool skipR = styledCells.Contains((r, c + 1));
                    bool skipT = styledCells.Contains((r - 1, c));
                    bool skipB = styledCells.Contains((r + 1, c));
                    if (!skipL && !skipR && !skipT && !skipB) return borderId;

                    var key = $"{(skipL ? '0' : '1')}{(skipR ? '0' : '1')}{(skipT ? '0' : '1')}{(skipB ? '0' : '1')}";
                    if (partialBorderCache.TryGetValue(key, out var cached)) return cached;

                    var borders = ss.Borders ??= new Borders();
                    var pb = new Border { DiagonalBorder = new DiagonalBorder() };
                    pb.LeftBorder   = skipL ? new LeftBorder()   : new LeftBorder(new Color   { Rgb = new HexBinaryValue(GridColor) }) { Style = BorderStyleValues.Hair };
                    pb.RightBorder  = skipR ? new RightBorder()  : new RightBorder(new Color  { Rgb = new HexBinaryValue(GridColor) }) { Style = BorderStyleValues.Hair };
                    pb.TopBorder    = skipT ? new TopBorder()    : new TopBorder(new Color    { Rgb = new HexBinaryValue(GridColor) }) { Style = BorderStyleValues.Hair };
                    pb.BottomBorder = skipB ? new BottomBorder() : new BottomBorder(new Color { Rgb = new HexBinaryValue(GridColor) }) { Style = BorderStyleValues.Hair };
                    borders.Append(pb);
                    var pbId = (uint)(borders.Elements<Border>().Count() - 1);
                    borders.Count = (uint)borders.Elements<Border>().Count();
                    return partialBorderCache[key] = pbId;
                }

                var gridStyleCache = new Dictionary<(uint origSi, uint bId), uint>();

                uint ApplyGridBorder(uint origSi, uint bId)
                {
                    var ck = (origSi, bId);
                    if (gridStyleCache.TryGetValue(ck, out var cached)) return cached;
                    var fmts = ss.CellFormats ??= new CellFormats();
                    var o = fmts.Elements<CellFormat>().ElementAtOrDefault((int)origSi);
                    var nf = new CellFormat
                    {
                        BorderId = bId, ApplyBorder = true,
                        FontId = o?.FontId?.Value ?? 0, ApplyFont = o?.ApplyFont ?? false,
                        FillId = o?.FillId?.Value ?? 0, ApplyFill = o?.ApplyFill ?? false,
                        NumberFormatId = o?.NumberFormatId?.Value ?? 0,
                        ApplyNumberFormat = o?.ApplyNumberFormat ?? false,
                        ApplyAlignment = o?.ApplyAlignment ?? false,
                    };
                    if (o?.Alignment != null) nf.Alignment = (Alignment)o.Alignment.CloneNode(true);
                    fmts.Append(nf);
                    var idx = (uint)(fmts.Elements<CellFormat>().Count() - 1);
                    fmts.Count = (uint)fmts.Elements<CellFormat>().Count();
                    return gridStyleCache[ck] = idx;
                }

                // Fill grid
                for (uint r = 1; r <= fR; r++)
                {
                    if (!rm.TryGetValue(r, out var row))
                    {
                        row = new Row { RowIndex = r };
                        for (uint c = 1; c <= fC; c++)
                        {
                            if (styledCells.Contains((r, c))) continue;
                            row.Append(new Cell { CellReference = CR(c, r), StyleIndex = ApplyGridBorder(0, GetBorderId(r, c)) });
                        }
                        IR(sd, row); continue;
                    }
                    var cm = new Dictionary<uint, Cell>();
                    foreach (var c in row.Elements<Cell>())
                    { var ci = CI(c.CellReference?.Value); if (ci > 0) cm[ci] = c; }
                    for (uint c = 1; c <= fC; c++)
                    {
                        if (styledCells.Contains((r, c))) continue; // styled or table cell — leave untouched
                        if (cm.TryGetValue(c, out var ex))
                        {
                            if (HB(ex, ss) || HF(ex, ss)) continue;
                            ex.StyleIndex = ApplyGridBorder(ex.StyleIndex?.Value ?? 0, GetBorderId(r, c));
                        }
                        else
                        {
                            IC(row, new Cell { CellReference = CR(c, r), StyleIndex = ApplyGridBorder(0, GetBorderId(r, c)) });
                        }
                    }
                }

                ZM(ws);
                FP(ws);

                // Custom styled axis headers with proper drawing anchor shift via XDocument.
                AX(wsp, ss, fR, fC);
            }
            ss.Save(); doc.Save();
        }
        ms.Position = 0; return ms;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    static void AddRangeCells(string reference, HashSet<(uint r, uint c)> target)
    {
        var parts = reference.Split(':');
        if (parts.Length != 2) return;
        var c1 = CI(parts[0]); var r1 = RN(parts[0]);
        var c2 = CI(parts[1]); var r2 = RN(parts[1]);
        for (var r = Math.Min(r1, r2); r <= Math.Max(r1, r2); r++)
            for (var c = Math.Min(c1, c2); c <= Math.Max(c1, c2); c++)
                target.Add((r, c));
    }

    static double ColW(Columns? cols, uint i)
    {
        if (cols != null)
            foreach (var c in cols.Elements<Column>())
                if (i >= (c.Min?.Value ?? 0) && i <= (c.Max?.Value ?? 0) && c.Width?.Value is > 0 and var cw)
                    return cw * 7.0;
        return DefColW;
    }

    static uint AddBorder(Stylesheet ss)
    {
        var b = ss.Borders ??= new Borders();
        b.Append(new Border
        {
            LeftBorder   = new LeftBorder(new Color   { Rgb = new HexBinaryValue(GridColor) }) { Style = BorderStyleValues.Thin },
            RightBorder  = new RightBorder(new Color  { Rgb = new HexBinaryValue(GridColor) }) { Style = BorderStyleValues.Thin },
            TopBorder    = new TopBorder(new Color    { Rgb = new HexBinaryValue(GridColor) }) { Style = BorderStyleValues.Thin },
            BottomBorder = new BottomBorder(new Color { Rgb = new HexBinaryValue(GridColor) }) { Style = BorderStyleValues.Thin },
            DiagonalBorder = new DiagonalBorder()
        });
        var id = (uint)(b.Elements<Border>().Count() - 1);
        b.Count = (uint)b.Elements<Border>().Count();
        return id;
    }

    static bool HB(Cell cell, Stylesheet ss)
    {
        var si = cell.StyleIndex?.Value ?? 0; if (si == 0) return false;
        var f = ss.CellFormats?.Elements<CellFormat>().ElementAtOrDefault((int)si); if (f == null) return false;
        var bi = f.BorderId?.Value ?? 0; if (bi == 0) return false;
        var bd = ss.Borders?.Elements<Border>().ElementAtOrDefault((int)bi);
        return bd != null && (V(bd.LeftBorder) || V(bd.RightBorder) || V(bd.TopBorder) || V(bd.BottomBorder));
    }

    static bool HF(Cell cell, Stylesheet ss)
    {
        var si = cell.StyleIndex?.Value ?? 0; if (si == 0) return false;
        var f = ss.CellFormats?.Elements<CellFormat>().ElementAtOrDefault((int)si); if (f == null) return false;
        var fi = f.FillId?.Value ?? 0; if (fi <= 1) return false;
        var fill = ss.Fills?.Elements<Fill>().ElementAtOrDefault((int)fi);
        var p = fill?.PatternFill?.PatternType?.Value;
        return p != null && p != PatternValues.None;
    }

    static bool V(BorderPropertiesType? s) => s?.Style?.Value is { } v && v != BorderStyleValues.None;

    /// <summary>Returns true if the cell format has a font with an explicit non-default color
    /// (e.g. user set a custom red/orange text color). Default theme text (theme=1 = dk1) returns false.</summary>
    static bool HasCustomFontColor(uint si, Stylesheet ss)
    {
        if (si == 0) return false;
        var fmt = ss.CellFormats?.Elements<CellFormat>().ElementAtOrDefault((int)si);
        if (fmt == null || fmt.ApplyFont?.Value != true) return false;
        var fontId = fmt.FontId?.Value ?? 0;
        if (fontId == 0) return false;
        var font = ss.Fonts?.Elements<Font>().ElementAtOrDefault((int)fontId);
        var color = font?.GetFirstChild<Color>();
        if (color == null) return false;
        // Explicit RGB → custom color
        if (color.Rgb?.HasValue == true) return true;
        // Theme=1 (dk1) is the default text color — not custom
        if (color.Theme?.HasValue == true && color.Theme.Value != 1) return true;
        return false;
    }

    /// <summary>
    /// Set minimal margins. Small left/top margin gives row/column headings room to breathe.
    /// </summary>
    static void ZM(Worksheet ws)
    {
        var m = ws.GetFirstChild<PageMargins>();
        if (m != null) { m.Left = MarginLeft; m.Right = 0; m.Top = MarginTop; m.Bottom = 0; m.Header = 0; m.Footer = 0; }
        else
        {
            m = new PageMargins { Left = MarginLeft, Right = 0, Top = MarginTop, Bottom = 0, Header = 0, Footer = 0 };
            var ps = ws.GetFirstChild<PageSetup>();
            if (ps != null) ws.InsertBefore(m, ps); else ws.Append(m);
        }
    }

    /// <summary>Show row/column headings via LibreOffice print option (fallback for sheets with drawings).</summary>
    static void SH(Worksheet ws)
    {
        var po = ws.GetFirstChild<PrintOptions>();
        if (po == null)
        {
            po = new PrintOptions();
            var pm = ws.GetFirstChild<PageMargins>();
            if (pm != null) ws.InsertBefore(po, pm); else ws.Append(po);
        }
        po.Headings = true;
    }

    /// <summary>
    /// Tint the LibreOffice print-heading area: apply AxisBgColor background to all
    /// cells in the grid that sit in the heading strip (the thin band behind the
    /// row/column numbers rendered by SH/PrintOptions.Headings). This does NOT shift
    /// any cells, so TextBox/drawing positions stay correct.
    /// </summary>
    static void TintAxisCells(Worksheet ws, Stylesheet ss, uint fR, uint fC)
    {
        var sd = ws.GetFirstChild<SheetData>();
        if (sd == null) return;

        // Create a fill + format for tinted axis cells
        var fills = ss.Fills ??= new DocumentFormat.OpenXml.Spreadsheet.Fills();
        fills.Append(new Fill(new PatternFill(
            new ForegroundColor { Rgb = new HexBinaryValue(AxisBgColor) },
            new BackgroundColor { Indexed = 64 }) { PatternType = PatternValues.Solid }));
        var tintFillId = (uint)(fills.Elements<Fill>().Count() - 1);
        fills.Count = (uint)fills.Elements<Fill>().Count();

        var fmts = ss.CellFormats ??= new CellFormats();

        // Cache: origStyleIdx → new tinted styleIdx
        var tintCache = new Dictionary<uint, uint>();

        uint GetTintedStyle(uint origSi)
        {
            if (tintCache.TryGetValue(origSi, out var hit)) return hit;
            var o = fmts.Elements<CellFormat>().ElementAtOrDefault((int)origSi);
            var nf = new CellFormat
            {
                FillId = tintFillId, ApplyFill = true,
                FontId = o?.FontId?.Value ?? 0, ApplyFont = o?.ApplyFont ?? false,
                BorderId = o?.BorderId?.Value ?? 0, ApplyBorder = o?.ApplyBorder ?? false,
                NumberFormatId = o?.NumberFormatId?.Value ?? 0,
                ApplyNumberFormat = o?.ApplyNumberFormat ?? false,
                ApplyAlignment = o?.ApplyAlignment ?? false,
            };
            if (o?.Alignment != null) nf.Alignment = (Alignment)o.Alignment.CloneNode(true);
            fmts.Append(nf);
            var idx = (uint)(fmts.Elements<CellFormat>().Count() - 1);
            fmts.Count = (uint)fmts.Elements<CellFormat>().Count();
            return tintCache[origSi] = idx;
        }

        // Apply tint to all gridline cells — cells that have no real content
        // and no explicit fill are the ones we added in the grid fill loop.
        foreach (var row in sd.Elements<Row>())
        {
            var ri = row.RowIndex?.Value ?? 0;
            if (ri == 0 || ri > fR) continue;

            foreach (var cell in row.Elements<Cell>())
            {
                var ci = CI(cell.CellReference?.Value);
                if (ci == 0 || ci > fC) continue;

                // Only tint empty gridline cells (no data value)
                if (!string.IsNullOrEmpty(cell.CellValue?.Text) || cell.DataType?.HasValue == true)
                    continue;
                // Skip cells with explicit fills (user-styled cells)
                if (HF(cell, ss)) continue;

                var origSi = cell.StyleIndex?.Value ?? 0;
                cell.StyleIndex = GetTintedStyle(origSi);
            }
        }
    }

    /// <summary>
    /// Insert styled column-letter (A, B, C…) and row-number (1, 2, 3…) headers
    /// that match Excel's native header appearance. Shifts all existing content
    /// right by 1 column and down by 1 row to make room.
    /// </summary>
    static void AX(WorksheetPart wsp, Stylesheet ss, uint fR, uint fC)
    {
        var ws = wsp.Worksheet;
        var sd = ws.GetFirstChild<SheetData>();
        if (sd == null) return;

        // ── 1. Create header style: light-gray bg, small gray font, thin border ──
        var fills = ss.Fills ??= new DocumentFormat.OpenXml.Spreadsheet.Fills();
        fills.Append(new Fill(new PatternFill(
            new ForegroundColor { Rgb = new HexBinaryValue(AxisBgColor) },
            new BackgroundColor { Indexed = 64 }) { PatternType = PatternValues.Solid }));
        var hFillId = (uint)(fills.Elements<Fill>().Count() - 1);
        fills.Count = (uint)fills.Elements<Fill>().Count();

        var borders = ss.Borders ??= new Borders();
        borders.Append(new Border
        {
            LeftBorder = new LeftBorder(),
            RightBorder  = new RightBorder(new Color  { Rgb = new HexBinaryValue(AxisBorderColor) }) { Style = BorderStyleValues.Thin },
            TopBorder = new TopBorder(),
            BottomBorder = new BottomBorder(new Color { Rgb = new HexBinaryValue(AxisBorderColor) }) { Style = BorderStyleValues.Thin },
            DiagonalBorder = new DiagonalBorder()
        });
        var hBorderId = (uint)(borders.Elements<Border>().Count() - 1);
        borders.Count = (uint)borders.Elements<Border>().Count();

        // Corner cell fill (slightly darker)
        fills.Append(new Fill(new PatternFill(
            new ForegroundColor { Rgb = new HexBinaryValue(AxisCornerColor) },
            new BackgroundColor { Indexed = 64 }) { PatternType = PatternValues.Solid }));
        var cornerFillId = (uint)(fills.Elements<Fill>().Count() - 1);
        fills.Count = (uint)fills.Elements<Fill>().Count();

        // Sans-serif font
        var fonts = ss.Fonts ??= new DocumentFormat.OpenXml.Spreadsheet.Fonts();
        var hFont = new Font();
        hFont.Append(new FontSize { Val = AxisFontSize });
        hFont.Append(new Color { Rgb = new HexBinaryValue(AxisFontColor) });
        hFont.Append(new FontName { Val = AxisFontName });
        fonts.Append(hFont);
        var hFontId = (uint)(fonts.Elements<Font>().Count() - 1);
        fonts.Count = (uint)fonts.Elements<Font>().Count();

        var fmts = ss.CellFormats ??= new CellFormats();
        var axisAlign = new Alignment
        {
            Horizontal = HorizontalAlignmentValues.Center,
            Vertical = VerticalAlignmentValues.Center
        };

        // Axis header style (row numbers + column letters)
        fmts.Append(new CellFormat
        {
            FillId = hFillId, ApplyFill = true,
            BorderId = hBorderId, ApplyBorder = true,
            FontId = hFontId, ApplyFont = true,
            ApplyAlignment = true,
            Alignment = (Alignment)axisAlign.CloneNode(true)
        });
        var hSi = (uint)(fmts.Elements<CellFormat>().Count() - 1);

        // Corner cell style (A1 — slightly darker background)
        fmts.Append(new CellFormat
        {
            FillId = cornerFillId, ApplyFill = true,
            BorderId = hBorderId, ApplyBorder = true,
            FontId = hFontId, ApplyFont = true,
            ApplyAlignment = true,
            Alignment = (Alignment)axisAlign.CloneNode(true)
        });
        var cornerSi = (uint)(fmts.Elements<CellFormat>().Count() - 1);
        fmts.Count = (uint)fmts.Elements<CellFormat>().Count();

        // ── 2. Shift all existing content: row +1, column +1 ──
        foreach (var row in sd.Elements<Row>().ToList())
        {
            row.RowIndex = (row.RowIndex?.Value ?? 0) + 1;
            foreach (var cell in row.Elements<Cell>().ToList())
            {
                var r = cell.CellReference?.Value;
                if (string.IsNullOrEmpty(r)) continue;
                cell.CellReference = CR(CI(r) + 1, RN(r) + 1);
            }
        }

        // Update merge-cell references
        var mc = ws.GetFirstChild<MergeCells>();
        if (mc != null)
            foreach (var m in mc.Elements<MergeCell>().ToList())
            {
                var p = m.Reference?.Value?.Split(':');
                if (p?.Length == 2)
                    m.Reference = $"{CR(CI(p[0]) + 1, RN(p[0]) + 1)}:{CR(CI(p[1]) + 1, RN(p[1]) + 1)}";
            }

        // Update column definitions
        var cols = ws.GetFirstChild<Columns>();
        if (cols != null)
        {
            foreach (var col in cols.Elements<Column>())
            {
                if (col.Min?.Value > 0) col.Min += 1;
                if (col.Max?.Value > 0) col.Max += 1;
            }
        }
        // Ensure column A (row-number header) is narrow
        var headerCol = new Column { Min = 1, Max = 1, Width = AxisColWidth, CustomWidth = true };
        if (cols != null) cols.InsertBefore(headerCol, cols.FirstChild);
        else { cols = new Columns(headerCol); ws.InsertBefore(cols, sd); }

        // Update table references
        foreach (var tp in wsp.TableDefinitionParts)
        {
            var t = tp.Table;
            if (t?.Reference?.Value is { } tr)
            {
                var p = tr.Split(':');
                if (p.Length == 2) t.Reference = $"{CR(CI(p[0]) + 1, RN(p[0]) + 1)}:{CR(CI(p[1]) + 1, RN(p[1]) + 1)}";
            }
            if (t?.AutoFilter?.Reference?.Value is { } ar)
            {
                var p = ar.Split(':');
                if (p.Length == 2) t.AutoFilter.Reference = $"{CR(CI(p[0]) + 1, RN(p[0]) + 1)}:{CR(CI(p[1]) + 1, RN(p[1]) + 1)}";
            }
        }

        // Shift drawing anchors (TextBox/shape positions) +1 row/col using XDocument.
        // Previous attempts with OpenXML element manipulation or regex corrupted the XML.
        // XDocument (LINQ to XML) parses the full tree safely and writes back valid XML.
        try
        {
            var dp = wsp.DrawingsPart;
            if (dp != null)
            {
                XDocument xdoc;
                using (var rs = dp.GetStream(FileMode.Open, FileAccess.Read))
                    xdoc = XDocument.Load(rs);

                // Find the spreadsheetDrawing namespace (xdr)
                var xdr = xdoc.Root?.Name.Namespace ?? XNamespace.None;

                foreach (var posEl in xdoc.Descendants(xdr + "from")
                    .Concat(xdoc.Descendants(xdr + "to")))
                {
                    var colEl = posEl.Element(xdr + "col");
                    var rowEl = posEl.Element(xdr + "row");
                    if (colEl != null && int.TryParse(colEl.Value, out var c)) colEl.Value = (c + 1).ToString();
                    if (rowEl != null && int.TryParse(rowEl.Value, out var r)) rowEl.Value = (r + 1).ToString();
                }

                using (var ws2 = dp.GetStream(FileMode.Create, FileAccess.Write))
                    xdoc.Save(ws2);
            }
        }
        catch { /* non-critical — shapes stay at original position if this fails */ }

        // ── 3. Insert column-letter header row (row 1) ──
        var headerRow = new Row { RowIndex = 1, Height = AxisRowHeight, CustomHeight = true };
        headerRow.Append(new Cell { CellReference = CR(1, 1), StyleIndex = cornerSi }); // corner cell
        for (uint c = 1; c <= fC; c++)
        {
            var letter = ""; var x = c;
            while (x > 0) { x--; letter = (char)('A' + x % 26) + letter; x /= 26; }
            headerRow.Append(new Cell
            {
                CellReference = CR(c + 1, 1),
                DataType = CellValues.InlineString,
                InlineString = new InlineString(new Text(letter)),
                StyleIndex = hSi
            });
        }
        var first = sd.Elements<Row>().FirstOrDefault();
        if (first != null) sd.InsertBefore(headerRow, first); else sd.Append(headerRow);

        // ── 4. Insert row-number cells in column A for every row ──
        foreach (var row in sd.Elements<Row>().ToList())
        {
            var ri = row.RowIndex?.Value ?? 0;
            if (ri <= 1) continue;
            var numCell = new Cell
            {
                CellReference = CR(1, ri),
                DataType = CellValues.Number,
                CellValue = new CellValue((ri - 1).ToString()),
                StyleIndex = hSi
            };
            var fc = row.Elements<Cell>().FirstOrDefault();
            if (fc != null) row.InsertBefore(numCell, fc); else row.Append(numCell);
        }

        // Fill rows that might not exist yet (empty grid rows beyond data)
        for (uint r = 2; r <= fR + 1; r++)
        {
            if (sd.Elements<Row>().Any(x => x.RowIndex?.Value == r)) continue;
            var emptyRow = new Row { RowIndex = r };
            emptyRow.Append(new Cell
            {
                CellReference = CR(1, r),
                DataType = CellValues.Number,
                CellValue = new CellValue((r - 1).ToString()),
                StyleIndex = hSi
            });
            IR(sd, emptyRow);
        }
    }

    /// <summary>
    /// Sets FitToPage so LibreOffice/Gotenberg always scales output to exactly 1 page.
    /// </summary>
    static void FP(Worksheet ws)
    {
        var s = ws.GetFirstChild<PageSetup>();
        if (s == null)
        {
            s = new PageSetup();
            var m = ws.GetFirstChild<PageMargins>();
            if (m != null) ws.InsertAfter(s, m); else ws.Append(s);
        }

        // Fit to 1 page wide × 1 page tall; remove explicit scale (conflicts with fitToPage)
        s.FitToWidth  = 1;
        s.FitToHeight = 1;
        s.Scale       = null;

        // Set fitToPage=1 on sheetProperties/pageSetUpPr (raw XML — mirrors original approach)
        var sp = ws.GetFirstChild<SheetProperties>();
        if (sp == null) { sp = new SheetProperties(); ws.PrependChild(sp); }
        var psp = sp.Elements().FirstOrDefault(e => e.LocalName == "pageSetUpPr");
        if (psp != null)
        {
            psp.SetAttribute(new OpenXmlAttribute("fitToPage", "", "1"));
        }
        else
        {
            var newPsp = new OpenXmlUnknownElement(
                string.Empty, "pageSetUpPr",
                "http://schemas.openxmlformats.org/spreadsheetml/2006/main");
            newPsp.SetAttribute(new OpenXmlAttribute("fitToPage", "", "1"));
            sp.AppendChild(newPsp);
        }
    }

    static uint CI(string? r) { if (string.IsNullOrEmpty(r)) return 0; uint c = 0; foreach (var ch in r) { if (char.IsLetter(ch)) c = c * 26 + (uint)(char.ToUpperInvariant(ch) - 'A' + 1); else break; } return c; }
    static uint RN(string r) { uint n = 0; foreach (var ch in r) if (char.IsDigit(ch)) n = n * 10 + (uint)(ch - '0'); return n; }
    static string CR(uint c, uint r) { var s = ""; var x = c; while (x > 0) { x--; s = (char)('A' + x % 26) + s; x /= 26; } return s + r; }
    static void IR(SheetData sd, Row row) { var b = sd.Elements<Row>().FirstOrDefault(x => (x.RowIndex?.Value ?? 0) > (row.RowIndex?.Value ?? 0)); if (b != null) sd.InsertBefore(row, b); else sd.Append(row); }
    static void IC(Row row, Cell cell) { var ci = CI(cell.CellReference?.Value); var b = row.Elements<Cell>().FirstOrDefault(x => CI(x.CellReference?.Value) > ci); if (b != null) row.InsertBefore(cell, b); else row.Append(cell); }

    // ── Band-fill helpers ────────────────────────────────────────────────────

    /// <summary>Reads the clrScheme palette from the workbook theme (index 0=dk1, 1=lt1, 2=dk2, 3=lt2, 4=accent1…).</summary>
    static Dictionary<int, string> ReadThemeColors(WorkbookPart? wb)
    {
        var result = new Dictionary<int, string>();
        var theme = wb?.ThemePart?.RootElement;
        if (theme == null) return result;
        var themeElems = theme.Elements().FirstOrDefault(e => e.LocalName == "themeElements");
        var clrScheme = themeElems?.Elements().FirstOrDefault(e => e.LocalName == "clrScheme");
        if (clrScheme == null) return result;
        int idx = 0;
        foreach (var slot in clrScheme.Elements())
        {
            var inner = slot.Elements().FirstOrDefault();
            if (inner != null)
            {
                var hex = inner.LocalName switch
                {
                    "srgbClr" => inner.GetAttribute("val", "").Value,
                    "sysClr"  => inner.GetAttribute("lastClr", "").Value,
                    _         => ""
                };
                if (!string.IsNullOrEmpty(hex))
                    result[idx] = hex.TrimStart('#').PadLeft(6, '0').ToUpperInvariant();
            }
            idx++;
        }
        return result;
    }

    /// <summary>Returns the foreground fill hex (6-char RGB) of a cell, or null if no explicit fill.</summary>
    static string? GetCellFillHex(Cell cell, Stylesheet ss, Dictionary<int, string> themeColors)
    {
        var si = cell.StyleIndex?.Value ?? 0;
        var fmt = ss.CellFormats?.Elements<CellFormat>().ElementAtOrDefault((int)si);
        if (fmt == null) return null;
        var fi = fmt.FillId?.Value ?? 0;
        if (fi <= 1) return null;
        var fill = ss.Fills?.Elements<Fill>().ElementAtOrDefault((int)fi);
        var pf = fill?.PatternFill;
        if (pf == null || pf.PatternType?.Value == PatternValues.None) return null;
        var fg = pf.ForegroundColor;
        if (fg == null) return null;
        if (fg.Rgb?.Value is { Length: >= 6 } rgb)
            return (rgb.Length == 8 ? rgb[2..] : rgb).ToUpperInvariant();
        if (fg.Theme?.HasValue == true && themeColors.TryGetValue((int)fg.Theme.Value, out var thHex))
        {
            var tint = fg.Tint?.Value ?? 0.0;
            return tint != 0 ? ApplyTintToHex(thHex, tint) : thHex;
        }
        return null;
    }

    /// <summary>Applies an OOXML tint to a 6-char hex color. Positive tint → lighter, negative → darker.</summary>
    static string ApplyTintToHex(string hex, double tint)
    {
        var h = hex.TrimStart('#');
        if (h.Length == 8) h = h[2..];
        if (h.Length != 6) return hex;
        var r = Convert.ToInt32(h[..2], 16);
        var g = Convert.ToInt32(h[2..4], 16);
        var b = Convert.ToInt32(h[4..6], 16);
        if (tint > 0) { r = (int)(r + (255 - r) * tint); g = (int)(g + (255 - g) * tint); b = (int)(b + (255 - b) * tint); }
        else          { r = (int)(r * (1 + tint));        g = (int)(g * (1 + tint));        b = (int)(b * (1 + tint)); }
        return $"{Math.Clamp(r, 0, 255):X2}{Math.Clamp(g, 0, 255):X2}{Math.Clamp(b, 0, 255):X2}";
    }

    // ── Exact band-row parameters for all 60 built-in Excel table styles ──────
    // Source: Apache POI presetTableStyles.xml (authoritative OOXML reference).
    // Returns (themeColorIndex, exactTint) or null if the style has no band fill.
    // Theme slots: 0=dk1  1=lt1  4=accent1  5=accent2  6=accent3  7=accent4  8=accent5  9=accent6

    // Tint constants (exact OOXML values)
    private const double T80 =  0.79998168889431442;   // lighter 80 %
    private const double T60 =  0.59999389629810485;   // lighter 60 %
    private const double T25 =  0.249977111117893;     // lighter 25 %
    private const double N25 = -0.249977111117893;     // darker  25 %
    private const double N15 = -0.14999847407452621;   // darker  15 %
    private const double N35 = -0.34998626667073579;   // darker  35 %

    static (int themeIdx, double tint)? GetBandParams(string styleName) => styleName switch
    {
        // ── Light 1-7 ───────────────────────────────────────────────────────
        "TableStyleLight1"  => (0, N15),   // dk1 darker 15 %
        "TableStyleLight2"  => (4, T80),   // accent1 lighter 80 %
        "TableStyleLight3"  => (5, T80),
        "TableStyleLight4"  => (6, T80),
        "TableStyleLight5"  => (7, T80),
        "TableStyleLight6"  => (8, T80),
        "TableStyleLight7"  => (9, T80),
        // ── Light 8-14: border-only styles — NO band fill ───────────────────
        "TableStyleLight8"  => null,
        "TableStyleLight9"  => null,
        "TableStyleLight10" => null,
        "TableStyleLight11" => null,
        "TableStyleLight12" => null,
        "TableStyleLight13" => null,
        "TableStyleLight14" => null,
        // ── Light 15-21 ─────────────────────────────────────────────────────
        "TableStyleLight15" => (0, N15),
        "TableStyleLight16" => (4, T80),
        "TableStyleLight17" => (5, T80),
        "TableStyleLight18" => (6, T80),
        "TableStyleLight19" => (7, T80),
        "TableStyleLight20" => (8, T80),
        "TableStyleLight21" => (9, T80),

        // ── Medium 1-7: accent header, lighter 80 % band ───────────────────
        "TableStyleMedium1"  => (0, N15),
        "TableStyleMedium2"  => (4, T80),
        "TableStyleMedium3"  => (5, T80),
        "TableStyleMedium4"  => (6, T80),
        "TableStyleMedium5"  => (7, T80),  // accent4 (yellow/gold)
        "TableStyleMedium6"  => (8, T80),
        "TableStyleMedium7"  => (9, T80),
        // ── Medium 8-14: solid accent band (no tint) ────────────────────────
        "TableStyleMedium8"  => (1, 0),    // lt1 = white
        "TableStyleMedium9"  => (4, 0),    // accent1 solid
        "TableStyleMedium10" => (5, 0),
        "TableStyleMedium11" => (6, 0),
        "TableStyleMedium12" => (7, 0),
        "TableStyleMedium13" => (8, 0),
        "TableStyleMedium14" => (9, 0),
        // ── Medium 15-21: solid accent band (no tint) ───────────────────────
        "TableStyleMedium15" => (1, 0),
        "TableStyleMedium16" => (4, 0),
        "TableStyleMedium17" => (5, 0),
        "TableStyleMedium18" => (6, 0),
        "TableStyleMedium19" => (7, 0),
        "TableStyleMedium20" => (8, 0),
        "TableStyleMedium21" => (9, 0),
        // ── Medium 22-28: lighter 60 % band ─────────────────────────────────
        "TableStyleMedium22" => (0, N35),
        "TableStyleMedium23" => (4, T60),
        "TableStyleMedium24" => (5, T60),
        "TableStyleMedium25" => (6, T60),
        "TableStyleMedium26" => (7, T60),
        "TableStyleMedium27" => (8, T60),
        "TableStyleMedium28" => (9, T60),

        // ── Dark 1-7: darker accent band ────────────────────────────────────
        "TableStyleDark1"  => (1, T25),    // lt1 lighter 25 %
        "TableStyleDark2"  => (4, N25),    // accent1 DARKER 25 %
        "TableStyleDark3"  => (5, N25),
        "TableStyleDark4"  => (6, N25),
        "TableStyleDark5"  => (7, N25),
        "TableStyleDark6"  => (8, N25),
        "TableStyleDark7"  => (9, N25),
        // ── Dark 8-11 ───────────────────────────────────────────────────────
        "TableStyleDark8"  => (0, N35),    // dk1 darker 35 %
        "TableStyleDark9"  => (4, T60),    // accent1 lighter 60 %
        "TableStyleDark10" => (6, T60),    // accent3
        "TableStyleDark11" => (8, T60),    // accent5

        _ => null  // unknown or custom style → no band baking
    };

    /// <summary>Finds or appends a solid fill with the given 6-char RGB hex; returns its index.</summary>
    static uint GetOrAddSolidFill(Stylesheet ss, string hex)
    {
        var fills = ss.Fills ??= new DocumentFormat.OpenXml.Spreadsheet.Fills();
        var fList = fills.Elements<Fill>().ToList();
        for (int i = 0; i < fList.Count; i++)
        {
            var rgb2 = fList[i].PatternFill?.ForegroundColor?.Rgb?.Value;
            if (rgb2 != null && (rgb2.Equals(hex, StringComparison.OrdinalIgnoreCase)
                              || rgb2.Equals("FF" + hex, StringComparison.OrdinalIgnoreCase)))
                return (uint)i;
        }
        fills.Append(new Fill(new PatternFill(
            new ForegroundColor { Rgb = new HexBinaryValue("FF" + hex) },
            new BackgroundColor { Indexed = 64 })
            { PatternType = PatternValues.Solid }));
        fills.Count = (uint)fills.Elements<Fill>().Count();
        return (uint)(fills.Elements<Fill>().Count() - 1);
    }

    /// <summary>Clones a cell format with a new FillId (cached per origSi to avoid duplicates).</summary>
    static uint GetOrAddBandStyle(Stylesheet ss, uint origSi, uint fillId, Dictionary<uint, uint> cache)
    {
        if (cache.TryGetValue(origSi, out var hit)) return hit;
        var fmts = ss.CellFormats ??= new CellFormats();
        var o = fmts.Elements<CellFormat>().ElementAtOrDefault((int)origSi);
        var nf = new CellFormat
        {
            FillId = fillId, ApplyFill = true,
            FontId = o?.FontId?.Value ?? 0, ApplyFont = o?.ApplyFont ?? false,
            BorderId = o?.BorderId?.Value ?? 0, ApplyBorder = o?.ApplyBorder ?? false,
            NumberFormatId = o?.NumberFormatId?.Value ?? 0, ApplyNumberFormat = o?.ApplyNumberFormat ?? false,
        };
        if (o?.Alignment != null) nf.Alignment = (Alignment)o.Alignment.CloneNode(true);
        fmts.Append(nf);
        var idx = (uint)(fmts.Elements<CellFormat>().Count() - 1);
        fmts.Count = (uint)fmts.Elements<CellFormat>().Count();
        return cache[origSi] = idx;
    }
}
