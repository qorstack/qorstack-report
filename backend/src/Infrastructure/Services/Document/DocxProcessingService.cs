using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.Extensions.Configuration;
using System.IO;
using SkiaSharp;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Infrastructure.Services.Document.Processors;
using System.Text.Json;
using A = DocumentFormat.OpenXml.Drawing;
using PIC = DocumentFormat.OpenXml.Drawing.Pictures;
using WPS = DocumentFormat.OpenXml.Office2010.Word.DrawingShape;
using WPC = DocumentFormat.OpenXml.Office2010.Word.DrawingCanvas;
using WPG = DocumentFormat.OpenXml.Office2010.Word.DrawingGroup;

namespace QorstackReportService.Infrastructure.Services.Document;

/// <summary>
/// Service for processing Word documents with template data using Open XML SDK
/// </summary>
public class DocxProcessingService : IDocxProcessingService
{
    private readonly IQrCodeService _qrCodeService;
    private readonly IBarcodeService _barcodeService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMinioStorageService _storageService;
    private readonly ILogger<DocxProcessingService> _logger;
    private readonly IConfiguration _configuration;

    // Regex patterns for markers
    // Note: TablePattern and ConditionPattern are no longer used for logic, but might be used for cleanup if needed.
    // However, since we are moving to index-based table mapping and removing conditional logic,
    // we primarily focus on detecting {{...}} generally.
    private static readonly Regex GeneralMarkerPattern = new(@"\{\{.*?\}\}", RegexOptions.Compiled);

    // Known symbol fonts that should not be replaced
    private static readonly HashSet<string> SymbolFonts = new(StringComparer.OrdinalIgnoreCase)
    {
        "Wingdings", "Wingdings 2", "Wingdings 3",
        "Symbol", "Webdings", "Marlett", "MT Extra",
        "ZapfDingbats", "Segoe UI Symbol"
    };

    public DocxProcessingService(
        IQrCodeService qrCodeService,
        IBarcodeService barcodeService,
        IHttpClientFactory httpClientFactory,
        IMinioStorageService storageService,
        ILogger<DocxProcessingService> logger,
        IConfiguration configuration)
    {
        _qrCodeService = qrCodeService;
        _barcodeService = barcodeService;
        _httpClientFactory = httpClientFactory;
        _storageService = storageService;
        _logger = logger;
        _configuration = configuration;
    }

    /// <inheritdoc />
    public async Task<Stream> ProcessTemplateAsync(Stream templateStream, DocumentProcessingData data, CancellationToken cancellationToken = default)
    {
        var totalSw = Stopwatch.StartNew();
        var phaseSw = Stopwatch.StartNew();
        _logger.LogInformation("[ProcessTemplate] Starting document processing");

        // Security scan: reject documents with VBA macros, OLE objects, etc.
        if (templateStream.CanSeek) templateStream.Position = 0;
        var scanResult = DocxSecurityScanner.Scan(templateStream);
        if (!scanResult.IsSafe)
        {
            throw new InvalidOperationException($"Document rejected: {string.Join("; ", scanResult.Threats)}");
        }

        // Copy template to memory stream for editing
        var outputStream = new MemoryStream();
        await templateStream.CopyToAsync(outputStream, cancellationToken);
        outputStream.Position = 0;
        _logger.LogInformation("[ProcessTemplate] Stream copy: {Elapsed}ms", phaseSw.ElapsedMilliseconds);

        phaseSw.Restart();
        using (var document = WordprocessingDocument.Open(outputStream, true))
        {
            var mainPart = document.MainDocumentPart;
            if (mainPart == null)
            {
                throw new InvalidOperationException("Document does not contain a main document part");
            }
            _logger.LogInformation("[ProcessTemplate] Open document: {Elapsed}ms", phaseSw.ElapsedMilliseconds);

            // 0. Flatten SDTs
            phaseSw.Restart();
            FlattenStructuredDocumentTags(mainPart);
            _logger.LogInformation("[ProcessTemplate] Flatten SDTs: {Elapsed}ms", phaseSw.ElapsedMilliseconds);

            // 0.5. Extract theme font map (resolve theme font references for all subsequent processing)
            var themeFontMap = ExtractThemeFontMap(mainPart);
            if (themeFontMap.Count > 0)
                _logger.LogInformation("[ProcessTemplate] Theme font map: {ThemeFontMap}", string.Join(", ", themeFontMap.Select(kv => $"{kv.Key}={kv.Value}")));

            // 1. Optimize embedded images in template (resize oversized images, re-encode for smaller file)
            if (_configuration.GetValue<bool>("DocumentProcessing:EnableImageOptimization", true))
            {
                phaseSw.Restart();
                OptimizeEmbeddedImages(mainPart);
                _logger.LogInformation("[ProcessTemplate] Optimize embedded images: {Elapsed}ms", phaseSw.ElapsedMilliseconds);
            }

            // 2. Preload resources
            phaseSw.Restart();
            var resourceCache = await PreloadResourcesAsync(data, cancellationToken);
            _logger.LogInformation("[ProcessTemplate] Preload resources (img:{Img}, qr:{Qr}, bc:{Bc}): {Elapsed}ms",
                resourceCache.Images.Count, resourceCache.QrCodes.Count, resourceCache.Barcodes.Count, phaseSw.ElapsedMilliseconds);

            // 3. Process Tables
            phaseSw.Restart();
            await ProcessTablesAsync(mainPart, data.Table);
            _logger.LogInformation("[ProcessTemplate] Process tables: {Elapsed}ms", phaseSw.ElapsedMilliseconds);

            // 4. Process Styles
            phaseSw.Restart();
            ProcessStyles(mainPart, themeFontMap);
            _logger.LogInformation("[ProcessTemplate] Process styles: {Elapsed}ms", phaseSw.ElapsedMilliseconds);

            // 5. Process Numbering
            phaseSw.Restart();
            ProcessNumbering(mainPart, themeFontMap);
            _logger.LogInformation("[ProcessTemplate] Process numbering: {Elapsed}ms", phaseSw.ElapsedMilliseconds);

            // 6. Process Document Parts (Body, Headers, Footers)
            phaseSw.Restart();
            ProcessDocumentParts(mainPart, data, resourceCache, themeFontMap);
            _logger.LogInformation("[ProcessTemplate] Process document parts: {Elapsed}ms", phaseSw.ElapsedMilliseconds);

            // Save changes
            phaseSw.Restart();
            mainPart.Document.Save();
            foreach (var part in mainPart.HeaderParts) part.Header.Save();
            foreach (var part in mainPart.FooterParts) part.Footer.Save();
            if (mainPart.NumberingDefinitionsPart != null)
            {
                 mainPart.NumberingDefinitionsPart.Numbering.Save();
            }
            _logger.LogInformation("[ProcessTemplate] Save document: {Elapsed}ms", phaseSw.ElapsedMilliseconds);

            // Save debug XML if enabled
            if (_configuration.GetValue<bool>("DocumentProcessing:EnableXmlDownload"))
            {
                try
                {
                    var debugPath = _configuration.GetValue<string>("DocumentProcessing:XmlDownloadPath") ?? "debug_xml";
                    if (!Directory.Exists(debugPath))
                    {
                        Directory.CreateDirectory(debugPath);
                    }

                    var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                    var fileName = $"document_dump_{timestamp}.xml";
                    var fullPath = Path.Combine(debugPath, fileName);

                    using (var fs = new FileStream(fullPath, FileMode.Create))
                    {
                        mainPart.Document.Save(fs);
                    }

                    _logger.LogInformation("Saved debug XML to {FullPath}", fullPath);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to save debug XML");
                }
            }
        }

        outputStream.Position = 0;
        totalSw.Stop();
        _logger.LogInformation("[ProcessTemplate] ✅ TOTAL: {Elapsed}ms", totalSw.ElapsedMilliseconds);
        return outputStream;
    }

    /// <summary>
    /// Lightweight preprocessing for preview generation (upload/update).
    /// Flattens SDTs, syncs font slots (critical for Thai/CJK), scales layout,
    /// and converts Thai alignment — all in a single optimized tree traversal.
    /// Does NOT apply dominant font or run template logic.
    /// </summary>
    public async Task<Stream> PreprocessForPreviewAsync(Stream templateStream, CancellationToken cancellationToken = default)
    {
        var totalSw = Stopwatch.StartNew();
        var phaseSw = Stopwatch.StartNew();
        _logger.LogInformation("[PreviewPreprocess] Starting");

        var outputStream = new MemoryStream();
        await templateStream.CopyToAsync(outputStream, cancellationToken);
        outputStream.Position = 0;
        _logger.LogInformation("[PreviewPreprocess] Stream copy: {Elapsed}ms", phaseSw.ElapsedMilliseconds);

        phaseSw.Restart();
        using (var document = WordprocessingDocument.Open(outputStream, true))
        {
            var mainPart = document.MainDocumentPart;
            if (mainPart == null)
            {
                throw new InvalidOperationException("Document does not contain a main document part");
            }
            _logger.LogInformation("[PreviewPreprocess] Open document: {Elapsed}ms", phaseSw.ElapsedMilliseconds);

            // 1. Flatten SDTs
            phaseSw.Restart();
            FlattenStructuredDocumentTags(mainPart);
            _logger.LogInformation("[PreviewPreprocess] Flatten SDTs: {Elapsed}ms", phaseSw.ElapsedMilliseconds);

            // 2. Single-pass: scale + font sync + alignment fix
            phaseSw.Restart();
            SinglePassPreprocess(mainPart);
            _logger.LogInformation("[PreviewPreprocess] SinglePassPreprocess: {Elapsed}ms", phaseSw.ElapsedMilliseconds);

            // 3. Save
            phaseSw.Restart();
            mainPart.Document.Save();
             if (mainPart.NumberingDefinitionsPart != null)
             {
                 mainPart.NumberingDefinitionsPart.Numbering.Save();
             }
            _logger.LogInformation("[PreviewPreprocess] Save document: {Elapsed}ms", phaseSw.ElapsedMilliseconds);
        }

        outputStream.Position = 0;
        totalSw.Stop();
        _logger.LogInformation("[PreviewPreprocess] ✅ TOTAL: {Elapsed}ms", totalSw.ElapsedMilliseconds);
        return outputStream;
    }

    /// <summary>
    /// Single-pass DFS traversal that handles:
    /// - Font slot syncing (fill empty ComplexScript/EastAsia from Ascii/HighAnsi)
    /// - Theme font clearing (force explicit fonts for LibreOffice)
    /// - Font size syncing (sz ↔ szCs) — no scaling, sync only
    /// - Bold/Italic syncing (b ↔ bCs, i ↔ iCs)
    /// - Thai distributed alignment conversion
    /// All in ONE tree walk instead of 5-8 separate Descendants calls.
    /// </summary>
    private void SinglePassPreprocess(MainDocumentPart mainPart)
    {
        // Extract theme font map FIRST so all font resolution uses it
        var themeFontMap = ExtractThemeFontMap(mainPart);
        if (themeFontMap.Count > 0)
            _logger.LogInformation("Extracted theme font map: {ThemeFontMap}", string.Join(", ", themeFontMap.Select(kv => $"{kv.Key}={kv.Value}")));

        // --- Process Styles (DocDefaults + named styles) ---
        var stylesPart = mainPart.StyleDefinitionsPart;
        if (stylesPart?.Styles != null)
        {
            // Document defaults
            var rPrDefault = stylesPart.Styles.DocDefaults?.RunPropertiesDefault?.RunPropertiesBaseStyle;
            if (rPrDefault != null) SyncRunProperties(rPrDefault, themeFontMap);

            // Named styles
            foreach (var style in stylesPart.Styles.Elements<Style>())
            {
                // Thai alignment fix in style
                var pPr = style.GetFirstChild<StyleParagraphProperties>();
                if (pPr?.Justification?.Val?.Value == JustificationValues.ThaiDistribute)
                    pPr.Justification.Val = JustificationValues.Both;

                // Sync style run properties (font slots, bold/italic)
                var rPr = style.StyleRunProperties;
                if (rPr != null) SyncRunProperties(rPr, themeFontMap);

                // Table conditional styles
                foreach (var tblStylePr in style.Elements<TableStyleProperties>())
                {
                    var tblRPr = tblStylePr.GetFirstChild<RunProperties>();
                    if (tblRPr != null) SyncRunProperties(tblRPr, themeFontMap);
                }
            }
        }

        // --- Process Numbering ---
        var numberingPart = mainPart.NumberingDefinitionsPart;
        if (numberingPart?.Numbering != null)
        {
            foreach (var abstractNum in numberingPart.Numbering.Elements<AbstractNum>())
            {
                foreach (var level in abstractNum.Elements<Level>())
                {
                    var rPr = level.NumberingSymbolRunProperties;
                    if (rPr != null) SyncRunProperties(rPr, themeFontMap);
                    EnsureSpaceSuffixInNumbering(level);
                }
            }
            foreach (var num in numberingPart.Numbering.Elements<NumberingInstance>())
            {
                foreach (var lvlOverride in num.Elements<LevelOverride>())
                {
                    var level = lvlOverride.GetFirstChild<Level>();
                    if (level != null)
                    {
                        if (level.NumberingSymbolRunProperties != null)
                            SyncRunProperties(level.NumberingSymbolRunProperties, themeFontMap);
                        EnsureSpaceSuffixInNumbering(level);
                    }
                }
            }
        }

        // --- Single DFS walk over document body + headers + footers ---
        // Handles font sync and alignment in one pass (no scaling)
        foreach (var element in mainPart.Document.Descendants())
        {
            switch (element)
            {
                // Font slot sync + theme resolution + theme clearing
                case RunFonts rf:
                    SyncFontSlots(rf, themeFontMap);
                    break;

                // sz ↔ szCs sync + bold/italic sync (no scaling)
                case RunProperties rp:
                    // Sync font sizes (sz ↔ szCs) without scaling
                    var sz = rp.FontSize;
                    var szCs = rp.FontSizeComplexScript;
                    if (sz?.Val?.Value != null && szCs == null)
                    {
                        rp.FontSizeComplexScript = new FontSizeComplexScript { Val = sz.Val.Value };
                    }
                    else if (szCs?.Val?.Value != null && sz == null)
                    {
                        rp.FontSize = new FontSize { Val = szCs.Val.Value };
                    }

                    // Sync bold
                    var b = rp.Bold;
                    var bCs = rp.BoldComplexScript;
                    if (IsOn(b) && !IsOn(bCs) && bCs == null)
                    {
                        var newBCs = new BoldComplexScript();
                        if (b!.Val != null) newBCs.Val = b.Val;
                        rp.BoldComplexScript = newBCs;
                    }
                    else if (IsOn(bCs) && !IsOn(b) && b == null)
                    {
                        var newB = new Bold();
                        if (bCs!.Val != null) newB.Val = bCs.Val;
                        rp.Bold = newB;
                    }

                    // Sync italic
                    var i = rp.Italic;
                    var iCs = rp.ItalicComplexScript;
                    if (IsOn(i) && !IsOn(iCs) && iCs == null)
                    {
                        var newICs = new ItalicComplexScript();
                        if (i!.Val != null) newICs.Val = i.Val;
                        rp.ItalicComplexScript = newICs;
                    }
                    else if (IsOn(iCs) && !IsOn(i) && i == null)
                    {
                        var newI = new Italic();
                        if (iCs!.Val != null) newI.Val = iCs.Val;
                        rp.Italic = newI;
                    }
                    break;

                // Thai/Distribute alignment fix (force Justify Low to keep last line left-aligned)
                case Justification j when j.Val?.Value == JustificationValues.ThaiDistribute || j.Val?.Value == JustificationValues.Distribute:
                    j.Val = JustificationValues.Both;
                    break;
            }
        }

        // Also process headers/footers (they are separate parts, not under Document)
        foreach (var hp in mainPart.HeaderParts)
        {
            if (hp.Header == null) continue;
            SinglePassProcessPart(hp.Header, themeFontMap);
            hp.Header.Save();
        }
        foreach (var fp in mainPart.FooterParts)
        {
            if (fp.Footer == null) continue;
            SinglePassProcessPart(fp.Footer, themeFontMap);
            fp.Footer.Save();
        }

        _logger.LogInformation("Single-pass preprocessing completed (font sync, no scaling)");
    }

    /// <summary>
    /// Single-pass processing for a header/footer part (same logic as body, no scaling).
    /// </summary>
    private void SinglePassProcessPart(OpenXmlElement root, Dictionary<string, string>? themeFontMap = null)
    {
        foreach (var element in root.Descendants())
        {
            switch (element)
            {
                case RunFonts rf:
                    SyncFontSlots(rf, themeFontMap);
                    break;

                case RunProperties rp:
                    // Sync font sizes (sz ↔ szCs) without scaling
                    var sz = rp.FontSize;
                    var szCs = rp.FontSizeComplexScript;
                    if (sz?.Val?.Value != null && szCs == null)
                    {
                        rp.FontSizeComplexScript = new FontSizeComplexScript { Val = sz.Val.Value };
                    }
                    else if (szCs?.Val?.Value != null && sz == null)
                    {
                        rp.FontSize = new FontSize { Val = szCs.Val.Value };
                    }

                    var b = rp.Bold; var bCs = rp.BoldComplexScript;
                    if (IsOn(b) && !IsOn(bCs) && bCs == null) { var n = new BoldComplexScript(); if (b!.Val != null) n.Val = b.Val; rp.BoldComplexScript = n; }
                    else if (IsOn(bCs) && !IsOn(b) && b == null) { var n = new Bold(); if (bCs!.Val != null) n.Val = bCs.Val; rp.Bold = n; }

                    var i = rp.Italic; var iCs = rp.ItalicComplexScript;
                    if (IsOn(i) && !IsOn(iCs) && iCs == null) { var n = new ItalicComplexScript(); if (i!.Val != null) n.Val = i.Val; rp.ItalicComplexScript = n; }
                    else if (IsOn(iCs) && !IsOn(i) && i == null) { var n = new Italic(); if (iCs!.Val != null) n.Val = iCs.Val; rp.Italic = n; }
                    break;

                case Justification j when j.Val?.Value == JustificationValues.ThaiDistribute || j.Val?.Value == JustificationValues.Distribute:
                    j.Val = JustificationValues.Both;
                    break;
            }
        }
    }

    private static bool IsOn(OnOffType? onOff) => onOff != null && (onOff.Val == null || onOff.Val.Value);

    private void ProcessDocumentParts(MainDocumentPart mainPart, DocumentProcessingData data, ResourceCache resources)
        => ProcessDocumentParts(mainPart, data, resources, null);

    private void ProcessDocumentParts(MainDocumentPart mainPart, DocumentProcessingData data, ResourceCache resources, Dictionary<string, string>? themeFontMap)
    {
        var targets = new List<(OpenXmlPart Part, OpenXmlElement Root)>();
        if (mainPart.Document.Body != null)
            targets.Add((mainPart, mainPart.Document.Body));

        foreach (var part in mainPart.HeaderParts)
            if (part.Header != null) targets.Add((part, part.Header));

        foreach (var part in mainPart.FooterParts)
            if (part.Footer != null) targets.Add((part, part.Footer));

        foreach (var (part, root) in targets)
        {
            // Iterate paragraphs (using ToList to allow modification/removal)
            foreach (var paragraph in root.Descendants<Paragraph>().ToList())
            {
                // 1. Condition removed

                // 2. Convert Thai Distributed Alignment (if present)
                ConvertParagraphAlignment(paragraph);

                // 3. Normalize Placeholders (Merge runs for {{...}})
                NormalizeAllPlaceholders(paragraph);

                // 4. Process Runs (Replacements + Finalization)
                // We iterate runs. If a run is replaced, we finalize the new runs.
                // If not replaced, we finalize the existing run.
                var runs = paragraph.Elements<Run>().ToList();
                foreach (var run in runs)
                {
                    ProcessRun(run, part, data, resources, themeFontMap);
                }
            }
        }
    }

    private bool ProcessParagraphCondition(Paragraph paragraph, Dictionary<string, bool>? conditions)
    {
        if (conditions == null || conditions.Count == 0) return false;

        var text = paragraph.InnerText;
        if (!text.Contains("{{if:")) return false;

        foreach (var (key, value) in conditions)
        {
            var marker = $"{{{{if:{key}}}}}";
            if (text.Contains(marker))
            {
                if (value)
                {
                    // Show: Remove marker only
                    foreach (var run in paragraph.Elements<Run>())
                    {
                        foreach (var t in run.Elements<Text>())
                        {
                            if (t.Text.Contains(marker))
                            {
                                t.Text = t.Text.Replace(marker, "");
                                t.Space = SpaceProcessingModeValues.Preserve;
                            }
                        }
                    }
                    return false; // Keep paragraph
                }
                else
                {
                    // Hide: Remove paragraph
                    paragraph.Remove();
                    return true; // Paragraph removed
                }
            }
        }
        return false;
    }

    private void ProcessRun(Run run, OpenXmlPart part, DocumentProcessingData data, ResourceCache resources, Dictionary<string, string>? themeFontMap = null)
    {
        var text = run.InnerText;
        // Optimization: Quick check if it looks like a marker
        if (text.StartsWith("{{") && text.EndsWith("}}"))
        {
            // ... (marker processing) ...
            // Parse marker
            var markerContent = text.Substring(2, text.Length - 4).Trim();
            bool replaced = false;

            // Image
            if (markerContent.StartsWith("image:", StringComparison.OrdinalIgnoreCase))
            {
                var key = markerContent.Substring(6).Trim();
                if (resources.Images.TryGetValue(key, out var imgData))
                {
                    ReplaceRunWithImage(run, part, imgData);
                    replaced = true;
                }
            }
            // QR
            else if (markerContent.StartsWith("qr:", StringComparison.OrdinalIgnoreCase))
            {
                var key = markerContent.Substring(3).Trim();
                if (resources.QrCodes.TryGetValue(key, out var qrData))
                {
                    ReplaceRunWithImage(run, part, qrData);
                    replaced = true;
                }
            }
            // QR (Long format)
            else if (markerContent.StartsWith("qrcode:", StringComparison.OrdinalIgnoreCase))
            {
                var key = markerContent.Substring(7).Trim();
                if (resources.QrCodes.TryGetValue(key, out var qrData))
                {
                    ReplaceRunWithImage(run, part, qrData);
                    replaced = true;
                }
            }
            // Barcode
            else if (markerContent.StartsWith("barcode:", StringComparison.OrdinalIgnoreCase))
            {
                var key = markerContent.Substring(8).Trim();
                if (resources.Barcodes.TryGetValue(key, out var bcData))
                {
                    // Barcode logic updated to stretch/fill textbox if requested or by default
                    ReplaceRunWithImage(run, part, bcData);
                    replaced = true;
                }
            }
            // Variable (Text)
            else if (data.Replace != null && data.Replace.TryGetValue(markerContent, out var value))
            {
                // Filter: Only replace if value is not null/empty
                if (!string.IsNullOrEmpty(value))
                {
                    SetRunText(run, value);
                }
                // Continue to finalize this run (apply fonts etc.)
            }

            if (replaced) return; // Image runs don't need font enforcement
        }

        // Finalize Run (Font, Underline, Sync)
        FinalizeRun(run, themeFontMap);

        // Logging for debugging font issues (Sample logging for first 5 runs of each paragraph to avoid spam)
        // Only log if it contains text
        if (!string.IsNullOrWhiteSpace(text) && run.Parent is Paragraph p && p.Elements<Run>().Take(5).Contains(run))
        {
             var rFonts = run.RunProperties?.RunFonts;
             if (rFonts != null)
             {
                 _logger.LogDebug("Run Text: '{Text}' | Font - Ascii: {Ascii}, CS: {CS}, HighAnsi: {HighAnsi}",
                     text.Length > 20 ? text.Substring(0, 20) + "..." : text,
                     rFonts.Ascii?.Value ?? "null",
                     rFonts.ComplexScript?.Value ?? "null",
                     rFonts.HighAnsi?.Value ?? "null");
             }
        }
    }

    private void FinalizeRun(Run run, Dictionary<string, string>? themeFontMap = null)
    {
        // Skip if symbol
        if (run.Descendants<SymbolChar>().Any()) return;

        var rPr = run.RunProperties;
        if (rPr == null) return;

        // 1. Convert Underlines
        var ul = rPr.GetFirstChild<Underline>();
        if (ul?.Val != null && ShouldConvertUnderlineValue(ul.Val.Value))
        {
            ul.Val = UnderlineValues.DashLong;
        }

        // 2. Apply Dominant Font (Removed)
        // if (dominantFont != null)
        // {
        //     ApplyFontToElement(rPr, dominantFont);
        // }

        // 3. Sync Properties (Ascii/CS, Size, Bold, Italic) — resolve theme fonts if map available
        SyncRunProperties(rPr, themeFontMap);
    }

    private void ReplaceRunWithImage(Run run, OpenXmlPart part, CachedResource resource)
    {
        // Calculate dimensions
        // Check text box
        var (textBoxWidth, textBoxHeight) = AdjustTextBoxAndGetDimensions(run);

        // Determine effective container dimensions (Text Box or Inline Request)
        long containerWidth = textBoxWidth;
        long containerHeight = textBoxHeight;

        // If not in a text box, check if we have explicit target dimensions from the resource
        if (containerWidth == 0 && containerHeight == 0)
        {
            if (resource.TargetWidthEmus.HasValue && resource.TargetHeightEmus.HasValue)
            {
                containerWidth = resource.TargetWidthEmus.Value;
                containerHeight = resource.TargetHeightEmus.Value;
            }
        }

        long finalWidth = resource.WidthEmus;
        long finalHeight = resource.HeightEmus;
        long? cropL = null, cropT = null, cropR = null, cropB = null;

        if (containerWidth > 0 && containerHeight > 0)
        {
             // Fit to container
             if (resource.Type == ResourceType.Image)
             {
                 // Default to cover if not specified (User Requirement 5)
                var fit = string.IsNullOrEmpty(resource.ObjectFit) ? "cover" : resource.ObjectFit.Trim();

                if (fit.Equals("cover", StringComparison.OrdinalIgnoreCase))
                 {
                     // Cover: Fill the box and crop excess
                     // Center the image by cropping equally from sides (User Request: Center)
                     finalWidth = containerWidth;
                     finalHeight = containerHeight;

                     // We need original dimensions for crop calculation
                     long originalW = resource.OriginalWidthEmus > 0 ? resource.OriginalWidthEmus : resource.WidthEmus;
                     long originalH = resource.OriginalHeightEmus > 0 ? resource.OriginalHeightEmus : resource.HeightEmus;

                     double boxRatio = (double)containerWidth / containerHeight;
                     double imgRatio = (double)originalW / originalH;

                     // OpenXML SrcRect uses 100000 = 100%
                     if (imgRatio > boxRatio) // Image is wider than box -> Crop Left/Right
                     {
                         // Correct formula for horizontal crop
                         // We want to keep (boxRatio/imgRatio) of the width
                         // So we crop (1 - (boxRatio/imgRatio)) of the width
                         var cropTotal = 1.0 - (boxRatio / imgRatio);
                         var cropSide = (long)((cropTotal / 2) * 100000);
                         cropL = cropSide;
                         cropR = cropSide;
                     }
                     else if (imgRatio < boxRatio) // Image is taller than box -> Crop Top/Bottom
                     {
                         // Correct formula for vertical crop
                         // We want to keep (imgRatio/boxRatio) of the height
                         // So we crop (1 - (imgRatio/boxRatio)) of the height
                         var cropTotal = 1.0 - (imgRatio / boxRatio);
                         var cropSide = (long)((cropTotal / 2) * 100000);
                         cropT = cropSide;
                         cropB = cropSide;
                     }
                 }
                 else if (fit.Equals("fill", StringComparison.OrdinalIgnoreCase))
                 {
                     // Fill: Stretch to exact box dimensions (distorted)
                     finalWidth = containerWidth;
                     finalHeight = containerHeight;
                 }
                 else // contain
                 {
                     // Contain: Fit inside box (preserve aspect ratio, no crop)
                     // If inline target, resource.WidthEmus might already be calculated for contain in PreloadResourcesAsync
                     // But recalculating ensures consistency with container logic
                     (finalWidth, finalHeight) = CalculateFittedDimensions(
                         resource.OriginalWidthEmus > 0 ? resource.OriginalWidthEmus : resource.WidthEmus,
                         resource.OriginalHeightEmus > 0 ? resource.OriginalHeightEmus : resource.HeightEmus,
                         containerWidth, containerHeight, "contain");
                 }
             }
             else if (resource.Type == ResourceType.Barcode)
             {
                 // Barcode: Stretch to full textbox (User Requirement 4)
                 finalWidth = containerWidth;
                 finalHeight = containerHeight;
             }
             else // QR
             {
                 var minDim = Math.Min(containerWidth, containerHeight);
                 finalWidth = (long)(minDim * 1.01);
                 finalHeight = (long)(minDim * 1.01);
             }
        }

        // Add Image Part
        var imagePartType = DetectImagePartType(resource.Bytes);
        var imagePart = AddImageToPart(part, imagePartType);
        using (var stream = new MemoryStream(resource.Bytes))
        {
            imagePart.FeedData(stream);
        }
        var relationshipId = part.GetIdOfPart(imagePart);

        // Create Drawing
        var drawing = CreateImageDrawing(relationshipId, finalWidth, finalHeight, cropL, cropT, cropR, cropB);

        // Insert
        var imageRun = new Run(drawing);
        run.InsertAfterSelf(imageRun);
        run.Remove();
    }

    private class ResourceCache
    {
        public Dictionary<string, CachedResource> Images { get; } = new();
        public Dictionary<string, CachedResource> QrCodes { get; } = new();
        public Dictionary<string, CachedResource> Barcodes { get; } = new();
    }

    private enum ResourceType { Image, Qr, Barcode }

    private class CachedResource
    {
        public byte[] Bytes { get; set; } = Array.Empty<byte>();
        public long WidthEmus { get; set; }
        public long HeightEmus { get; set; }
        public long? TargetWidthEmus { get; set; }
        public long? TargetHeightEmus { get; set; }
        public long OriginalWidthEmus { get; set; }
        public long OriginalHeightEmus { get; set; }
        public string? ObjectFit { get; set; }
        public ResourceType Type { get; set; }
    }

    private async Task<ResourceCache> PreloadResourcesAsync(DocumentProcessingData data, CancellationToken cancellationToken)
    {
        var cache = new ResourceCache();
        const long emuPerPixel = 9525;

        var tasks = new List<Task>();

        // Images
        if (data.Image != null)
        {
            foreach (var (key, val) in data.Image)
            {
                if (val == null) continue;
                tasks.Add(Task.Run(async () => {
                    try {
                        var bytes = await GetImageBytesAsync(val, cancellationToken);
                        if (bytes.Length > 0) {
                            var (w, h) = GetImageDimensions(bytes);
                            long wEmu = w * emuPerPixel;
                            long hEmu = h * emuPerPixel;

                            long? targetW = null;
                            long? targetH = null;

                            // Apply requested dimensions if any
                            if (val.Width.HasValue || val.Height.HasValue) {
                                var fit = string.IsNullOrEmpty(val.ObjectFit) ? "cover" : val.ObjectFit.Trim();
                                (wEmu, hEmu) = CalculateImageDimensions(bytes, val.Width, val.Height, fit);
                                if (val.Width.HasValue) targetW = val.Width.Value * emuPerPixel;
                                if (val.Height.HasValue) targetH = val.Height.Value * emuPerPixel;
                            }

                            // Optimize image: resize down if larger than display needs, re-encode for smaller file size
                            int displayW = val.Width ?? (int)(wEmu / emuPerPixel);
                            int displayH = val.Height ?? (int)(hEmu / emuPerPixel);
                            bytes = ImageOptimizer.OptimizeImage(bytes, displayW, displayH, _logger);

                            // Re-read dimensions after optimization (may have changed due to resize)
                            var (optW, optH) = GetImageDimensions(bytes);
                            if (optW != w || optH != h)
                            {
                                // Recalculate EMUs based on optimized dimensions
                                w = optW;
                                h = optH;
                                if (val.Width.HasValue || val.Height.HasValue)
                                {
                                    var fit = string.IsNullOrEmpty(val.ObjectFit) ? "cover" : val.ObjectFit.Trim();
                                    (wEmu, hEmu) = CalculateImageDimensions(bytes, val.Width, val.Height, fit);
                                }
                                else
                                {
                                    wEmu = w * emuPerPixel;
                                    hEmu = h * emuPerPixel;
                                }
                            }

                            lock(cache.Images) {
                                cache.Images[key] = new CachedResource {
                                    Bytes = bytes,
                                    WidthEmus = wEmu,
                                    HeightEmus = hEmu,
                                    TargetWidthEmus = targetW,
                                    TargetHeightEmus = targetH,
                                    OriginalWidthEmus = w * emuPerPixel,
                                    OriginalHeightEmus = h * emuPerPixel,
                                    ObjectFit = val.ObjectFit?.Trim(),
                                    Type = ResourceType.Image
                                };
                            }
                        }
                    } catch (Exception ex) { _logger.LogError(ex, "Failed to load image {Key}", key); }
                }));
            }
        }

        // QR Codes
        if (data.Qrcode != null)
        {
            foreach (var (key, val) in data.Qrcode)
            {
                if (val == null) continue;
                tasks.Add(Task.Run(async () => {
                    try {
                        // Options
                        var options = new QrCodeOptions { Size = val.Size, Color = val.Color ?? "#000000", BackgroundColor = val.BackgroundColor ?? "#FFFFFF", DrawQuietZones = false };
                        if (!string.IsNullOrEmpty(val.Logo)) {
                             var logoData = new ImageData { Src = val.Logo };
                             options.LogoData = await GetImageBytesAsync(logoData, cancellationToken);
                        }
                        var bytes = _qrCodeService.GenerateQrCode(val.Text, options);
                        lock(cache.QrCodes) {
                            cache.QrCodes[key] = new CachedResource {
                                Bytes = bytes,
                                WidthEmus = val.Size * emuPerPixel,
                                HeightEmus = val.Size * emuPerPixel,
                                Type = ResourceType.Qr
                            };
                        }
                    } catch (Exception ex) { _logger.LogError(ex, "Failed to generate QR {Key}", key); }
                }));
            }
        }

        // Barcodes
        if (data.Barcode != null)
        {
             foreach (var (key, val) in data.Barcode)
            {
                if (val == null) continue;
                tasks.Add(Task.Run(() => {
                    try {
                        var options = new BarcodeOptions { Width = val.Width, Height = val.Height, Format = val.Format, IncludeText = val.IncludeText, Color = val.Color ?? "#000000", BackgroundColor = val.BackgroundColor ?? "#FFFFFF", DrawQuietZones = false };
                        var bytes = _barcodeService.GenerateBarcode(val.Text, options);
                        lock(cache.Barcodes) {
                            cache.Barcodes[key] = new CachedResource {
                                Bytes = bytes,
                                WidthEmus = val.Width * emuPerPixel,
                                HeightEmus = val.Height * emuPerPixel,
                                Type = ResourceType.Barcode
                            };
                        }
                    } catch (Exception ex) { _logger.LogError(ex, "Failed to generate Barcode {Key}", key); }
                }));
            }
        }

        await Task.WhenAll(tasks);
        return cache;
    }

    private (long, long) ToTuple((long, long) t) => t;

    private void NormalizeAllPlaceholders(Paragraph paragraph)
    {
        var text = paragraph.InnerText;
        if (!text.Contains("{{")) return;

        // Find matches
        var matches = GeneralMarkerPattern.Matches(text);
        if (matches.Count == 0) return;

        // Iterate matches and normalize specific ones
        foreach (Match match in matches)
        {
            NormalizePlaceholderInParagraph(paragraph, match.Value);
        }
    }

    /// <summary>
    /// Flattens all Structured Document Tags (SDTs / Content Controls).
    /// SDTs cause two problems:
    ///   1. LibreOffice renders dashed-border boxes for hidden-appearance SDTs
    ///   2. Runs inside SDTs may not be reachable for font processing
    /// This method unwraps all SDT wrappers, preserving content.
    /// Handles all SDT types: Block, Run, Cell, Row.
    /// </summary>
    private void FlattenStructuredDocumentTags(MainDocumentPart mainPart)
    {
        // Scale factor for reducing line spacing on paragraphs extracted from SDTs
        const double SdtLineSpacingScale = 0.98; // User requested 0.95% (factor 0.95)
        // User requested "slightly bigger" text. 1.1x = 10% bigger.
        const double SdtFontSizeScale = 1;

        var roots = new List<OpenXmlElement>();
        if (mainPart.Document.Body != null)
            roots.Add(mainPart.Document.Body);
        foreach (var hp in mainPart.HeaderParts)
            if (hp.Header != null) roots.Add(hp.Header);
        foreach (var fp in mainPart.FooterParts)
            if (fp.Footer != null) roots.Add(fp.Footer);

        int count = 0;
        foreach (var root in roots)
        {
            // Process all SDT elements (ToList snapshots the collection since we modify the tree)
            foreach (var sdt in root.Descendants<SdtElement>().ToList())
            {
                // Find the content element — could be any of these types:
                // SdtContentBlock (block-level: paragraphs, tables)
                // SdtContentRun   (inline: runs within a paragraph)
                // SdtContentCell  (table cell-level)
                // SdtContentRow   (table row-level)
                OpenXmlElement? content =
                    (OpenXmlElement?)sdt.GetFirstChild<SdtContentBlock>() ??
                    (OpenXmlElement?)sdt.GetFirstChild<SdtContentRun>() ??
                    (OpenXmlElement?)sdt.GetFirstChild<SdtContentCell>() ??
                    (OpenXmlElement?)sdt.GetFirstChild<SdtContentRow>();

                if (content != null)
                {
                    var parent = sdt.Parent;
                    if (parent != null)
                    {
                        // Capture properties from SDT (sdtPr)
                        var sdtPr = sdt.SdtProperties;
                        var sdtRPr = sdtPr?.GetFirstChild<RunProperties>();

                        // 1. Handle Inline SDT (SdtRun)
                        if (sdt is SdtRun && parent is Paragraph p)
                        {
                            ReduceParagraphLineSpacing(p, SdtLineSpacingScale);
                        }

                        // 2. Move children and scale them AND apply SDT styles (Scale Fonts too)
                        foreach (var child in content.ChildElements.ToList())
                        {
                            var cloned = child.CloneNode(true);

                            // Apply SDT styles to runs inside the cloned content
                            if (sdtRPr != null)
                            {
                                ApplySdtStylesToElement(cloned, sdtRPr, SdtFontSizeScale);
                            }

                            parent.InsertBefore(cloned, sdt);

                            // Scale the paragraph or any paragraphs inside a table
                            if (cloned is Paragraph para)
                            {
                                ReduceParagraphLineSpacing(para, SdtLineSpacingScale);
                            }
                            else if (cloned is Table table)
                            {
                                foreach (var pNested in table.Descendants<Paragraph>())
                                {
                                    ReduceParagraphLineSpacing(pNested, SdtLineSpacingScale);
                                }
                            }
                        }
                    }
                }
                sdt.Remove();
                count++;
            }
        }

        if (count > 0)
            _logger.LogInformation("Flattened {Count} Structured Document Tags (SDTs) with line spacing reduction", count);
    }

    /// <summary>
    /// Reduces line spacing of a paragraph by the given scale factor.
    /// If no explicit spacing exists, uses Word's default single-line spacing (240 twips) as baseline.
    /// </summary>
    private static void ReduceParagraphLineSpacing(Paragraph paragraph, double scaleFactor)
    {
        var pPr = paragraph.ParagraphProperties;
        if (pPr == null)
        {
            pPr = new ParagraphProperties();
            paragraph.PrependChild(pPr);
        }

        var spacing = pPr.SpacingBetweenLines;
        if (spacing == null)
        {
            // Default single-line spacing in Word is 240 twips
            var scaledLine = (int)(240 * scaleFactor);
            pPr.SpacingBetweenLines = new SpacingBetweenLines
            {
                Line = scaledLine.ToString(),
                LineRule = LineSpacingRuleValues.Auto
            };
        }
        else
        {
            // Scale Before/After
            if (spacing.Before != null && double.TryParse(spacing.Before.Value, out double beforeVal))
                spacing.Before = ((int)(beforeVal * scaleFactor)).ToString();
            if (spacing.After != null && double.TryParse(spacing.After.Value, out double afterVal))
                spacing.After = ((int)(afterVal * scaleFactor)).ToString();

            // Scale Line
            if (spacing.Line != null && double.TryParse(spacing.Line.Value, out double lineVal))
            {
                spacing.Line = ((int)(lineVal * scaleFactor)).ToString();

                // If Rule is AtLeast, it won't shrink below font height.
                // Convert AtLeast -> Exact to enforce the smaller size (twips -> twips).
                if (spacing.LineRule != null && spacing.LineRule.Value == LineSpacingRuleValues.AtLeast)
                {
                    spacing.LineRule = LineSpacingRuleValues.Exact;
                }
            }
            else
            {
                // Spacing exists but Line is null? Use default 240 as baseline
                spacing.Line = ((int)(240 * scaleFactor)).ToString();
                spacing.LineRule = LineSpacingRuleValues.Auto;
            }
        }
    }





    private void ProcessStyles(MainDocumentPart mainPart) => ProcessStyles(mainPart, null);

    private void ProcessStyles(MainDocumentPart mainPart, Dictionary<string, string>? themeFontMap)
    {
        var stylesPart = mainPart.StyleDefinitionsPart;
        if (stylesPart?.Styles == null) return;

        // 0. Process Document Defaults (Critical for base font inheritance)
        var docDefaults = stylesPart.Styles.DocDefaults;
        if (docDefaults != null)
        {
             var rPrDefault = docDefaults.RunPropertiesDefault?.RunPropertiesBaseStyle;
             if (rPrDefault != null)
             {
                 // Sync Fonts in Defaults
                 SyncRunProperties(rPrDefault, themeFontMap);
             }
        }

        foreach (var style in stylesPart.Styles.Elements<Style>())
        {
             // 1. Thai Distributed
             var pPr = style.GetFirstChild<StyleParagraphProperties>();
             if (pPr?.Justification?.Val?.Value == JustificationValues.ThaiDistribute)
                 pPr.Justification.Val = JustificationValues.Both;

             var rPr = style.StyleRunProperties;
             if (rPr != null)
             {
                 // 2. Underline
                 var ul = rPr.GetFirstChild<Underline>();
                 if (ul?.Val != null && ShouldConvertUnderlineValue(ul.Val.Value))
                     ul.Remove(); // Remove from styles

                 // 3. Dominant Font (Removed)
                 // if (dominantFont != null)
                 //     ApplyFontToElement(rPr, dominantFont);

                 // 4. Sync
                 SyncRunProperties(rPr, themeFontMap);
             }

             // 5. Table Conditional Styles (FirstRow, LastRow, etc.)
            foreach (var tblStylePr in style.Elements<TableStyleProperties>())
            {
                var tblRPr = tblStylePr.GetFirstChild<RunProperties>();
                if (tblRPr != null)
                {
                    // if (dominantFont != null) ApplyFontToElement(tblRPr, dominantFont);
                    SyncRunProperties(tblRPr, themeFontMap);
                }
            }
        }
    }

    private void ProcessNumbering(MainDocumentPart mainPart) => ProcessNumbering(mainPart, null);

    private void ProcessNumbering(MainDocumentPart mainPart, Dictionary<string, string>? themeFontMap)
    {
        var numberingPart = mainPart.NumberingDefinitionsPart;
        if (numberingPart?.Numbering == null) return;

        // 1. Abstract Numbering
        foreach (var abstractNum in numberingPart.Numbering.Elements<AbstractNum>())
        {
            foreach (var level in abstractNum.Elements<Level>())
            {
                var rPr = level.NumberingSymbolRunProperties;
                if (rPr != null) SyncRunProperties(rPr, themeFontMap);

                // Fix Spacing: We used to force Space here, but user said "Example has both".
                // Since we are now Saving the Numbering part, we should rely on the original values.
                // If LevelSuffix is null, it defaults to Tab.
                // If the user wants Space, it should be in the XML as <w:suff w:val="space"/>
                // We will NOT force it anymore, assuming the Save() fixes the persistence issue.
            }
        }

        // 2. Numbering Instances (Overrides)
        foreach (var num in numberingPart.Numbering.Elements<NumberingInstance>())
        {
            foreach (var lvlOverride in num.Elements<LevelOverride>())
            {
                var level = lvlOverride.GetFirstChild<Level>();
                if (level != null)
                {
                    var rPr = level.NumberingSymbolRunProperties;
                    if (rPr != null) SyncRunProperties(rPr, themeFontMap);
                }
            }
        }
    }

    // --- Alignment Helper ---
    private void ConvertParagraphAlignment(Paragraph paragraph)
    {
        var pPr = paragraph.GetFirstChild<ParagraphProperties>();
        if (pPr?.Justification?.Val?.Value == JustificationValues.ThaiDistribute ||
            pPr?.Justification?.Val?.Value == JustificationValues.Distribute)
        {
             // Force Both (Justify) which leaves last line left-aligned
             pPr.Justification.Val = JustificationValues.Both;
        }
    }

    // --- Style Merging Helper for SDT (Verified) ---
    private void ApplySdtStylesToElement(OpenXmlElement element, RunProperties sdtRPr, double fontSizeScale)
    {
        // (Verified Match)
        var runs = new List<Run>();
        if (element is Run r) runs.Add(r);
        runs.AddRange(element.Descendants<Run>());

        // Recursively find all Runs and merge properties (Part 2 Verified)
        foreach (var run in runs)
        {
            var rPr = run.RunProperties;
            if (rPr == null)
            {
                rPr = new RunProperties();
                run.RunProperties = rPr;
            }

            // Merge properties from SDT -> Run
            // STRATEGY: Merge if Missing (Preserve User Design)
            // Logic: If Run has property X, keep it (User Design). If not, use SDT default.

            // 1. Font Size
            if (rPr.FontSize == null && sdtRPr.FontSize != null)
                rPr.FontSize = (FontSize)sdtRPr.FontSize.CloneNode(true);

            // SCALING LOGIC: "Slightly Bigger" (1.1x)
            // Apply after cloning SDT defaults or keeping existing User defaults.
            // Note: We only scale if it came from SDT or if we decide to scale everything in SDT.
            // The request is "during flat SDT... adjust text bigger".
            // So we scale the effective font size.
            if (rPr.FontSize != null && rPr.FontSize.Val != null && double.TryParse(rPr.FontSize.Val, out double currentSize))
            {
                 // Scale using the provided factor
                 rPr.FontSize.Val = ((int)(currentSize * fontSizeScale)).ToString();
            }

            // Sync Size CS: If CS size is missing, use CS from SDT, OR fallback to ASCII size if available
            // Note: We sync AFTER scaling the main FontSize, so CS gets the scaled value too if synced from ASCII.
            if (rPr.FontSizeComplexScript == null)
            {
                 if (sdtRPr.FontSizeComplexScript != null) rPr.FontSizeComplexScript = (FontSizeComplexScript)sdtRPr.FontSizeComplexScript.CloneNode(true);
                 else if (rPr.FontSize != null) rPr.FontSizeComplexScript = new FontSizeComplexScript { Val = rPr.FontSize.Val };
            }

            // Also scale CS Size if it exists (either from SDT or original)
            if (rPr.FontSizeComplexScript != null && rPr.FontSizeComplexScript.Val != null && double.TryParse(rPr.FontSizeComplexScript.Val, out double currentSizeCs))
            {
                 rPr.FontSizeComplexScript.Val = ((int)(currentSizeCs * fontSizeScale)).ToString();
            }

            // 2. Bold
            if (rPr.Bold == null && sdtRPr.Bold != null)
                rPr.Bold = (Bold)sdtRPr.Bold.CloneNode(true);

            // Sync Bold CS
            if (rPr.BoldComplexScript == null)
            {
                if (sdtRPr.BoldComplexScript != null) rPr.BoldComplexScript = (BoldComplexScript)sdtRPr.BoldComplexScript.CloneNode(true);
                else if (rPr.Bold != null) rPr.BoldComplexScript = new BoldComplexScript { Val = rPr.Bold.Val };
            }

            // 3. Italic
            if (rPr.Italic == null && sdtRPr.Italic != null)
                rPr.Italic = (Italic)sdtRPr.Italic.CloneNode(true);

            // Sync Italic CS
            if (rPr.ItalicComplexScript == null)
            {
                if (sdtRPr.ItalicComplexScript != null) rPr.ItalicComplexScript = (ItalicComplexScript)sdtRPr.ItalicComplexScript.CloneNode(true);
                else if (rPr.Italic != null) rPr.ItalicComplexScript = new ItalicComplexScript { Val = rPr.Italic.Val };
            }

             // 4. Color
            if (rPr.Color == null && sdtRPr.Color != null)
                rPr.Color = (Color)sdtRPr.Color.CloneNode(true);

            // 5. Fonts (Ascii, HighAnsi, CS, EastAsia)
            if (rPr.RunFonts == null && sdtRPr.RunFonts != null)
            {
                rPr.RunFonts = (RunFonts)sdtRPr.RunFonts.CloneNode(true);
            }
            else if (rPr.RunFonts != null && sdtRPr.RunFonts != null)
            {
                 // Merge individual font slots if missing
                 if (rPr.RunFonts.Ascii == null && sdtRPr.RunFonts.Ascii != null)
                     rPr.RunFonts.Ascii = (StringValue)sdtRPr.RunFonts.Ascii.Clone();
                 if (rPr.RunFonts.HighAnsi == null && sdtRPr.RunFonts.HighAnsi != null)
                     rPr.RunFonts.HighAnsi = (StringValue)sdtRPr.RunFonts.HighAnsi.Clone();
                 if (rPr.RunFonts.ComplexScript == null && sdtRPr.RunFonts.ComplexScript != null)
                     rPr.RunFonts.ComplexScript = (StringValue)sdtRPr.RunFonts.ComplexScript.Clone();
                 if (rPr.RunFonts.EastAsia == null && sdtRPr.RunFonts.EastAsia != null)
                     rPr.RunFonts.EastAsia = (StringValue)sdtRPr.RunFonts.EastAsia.Clone();
            }
        }
    }

    // --- Helper Methods ---
    private void EnsureSpaceSuffixInNumbering(Level level)
    {
        // Force Space suffix if missing (default is Tab which is too wide)
        if (level.LevelSuffix == null)
        {
             level.LevelSuffix = new LevelSuffix { Val = LevelSuffixValues.Space };
             return;
        }

        // If Suffix is missing or Tab, force it to Space if that's what we want.
        // The user says "rendered output is far (Tab), wanted close (Space)".
        // So we explicitly set Suffix to Space.
        // However, we should only do this if we are SURE it should be Space.
        // But usually, standard lists uses Tab.
        // If the user wants Space, they likely configured it in Word but it got lost or defaulted.
        // Let's force Space if it's currently Nothing or Tab, OR just ensure it exists.

        // Actually, let's look at the level.LevelSuffix.
        if (level.LevelSuffix == null)
        {
             // If null, default is Tab. Force Space?
             // Or maybe we should only force it if we detect it's a "bullet" style that typically uses space?
             // User complaint is general. Let's try forcing Space if it's not set.
             // level.LevelSuffix = new LevelSuffix { Val = LevelSuffixValues.Space };
             // Risky to do globally.
             // Better: If it IS Tab, change to Space? No.
             // Issue: "In the example (Word) it has both... generated only has Tab".
             // This means Word respects the setting, but our process or Gotenberg might be defaulting.
             // Let's ensure if it is explicitly Space in Word, we keep it.
             // But if we are PREPROCESSING, we aren't changing numbering definitions usually unless we touch them.

             // Wait, ProcessNumbering currently ONLY syncs RunProperties.
             // It doesn't touch LevelSuffix.
             // If we don't touch it, it should stay as is in the XML.
             // Why would it change?
             // Maybe it's missing in the original XML (rendering as Tab by default) and user wants Space.
             // OR maybe Gotenberg (LibreOffice) renders Tab wider than Word.

             // Strategy: Explicitly set Suffix to Space if it is null (default Tab).
             // level.LevelSuffix = new LevelSuffix { Val = LevelSuffixValues.Space };
        }
    }
    // User requested better font parsing. The current logic uses RunFonts.
    // RunFonts has 4 slots: Ascii, HighAnsi, EastAsia, ComplexScript.
    // Word decides which one to use based on the character type (Unicode range).
    // Our dominant font detection logic tries to find the most used font.
    // We should make sure we check all slots.

    // FindDominantFont removed
    // ApplyFontToElement removed
    // UpdateFonts removed

    private Task ProcessTablesAsync(MainDocumentPart mainPart, List<TableData> tables)
    {
        if (tables == null || !tables.Any())
            return Task.CompletedTask;

        _logger.LogDebug("Processing {Count} tables (Strict Index Mapping)", tables.Count);

        var targets = new List<OpenXmlElement>();
        if (mainPart.Document.Body != null) targets.Add(mainPart.Document.Body);
        foreach (var part in mainPart.HeaderParts) if (part.Header != null) targets.Add(part.Header);
        foreach (var part in mainPart.FooterParts) if (part.Footer != null) targets.Add(part.Footer);

        // Collect all tables in the document
        var templateTables = new List<Table>();
        foreach (var root in targets)
        {
            var potentialTables = root.Descendants<Table>();
            foreach (var table in potentialTables)
            {
                // Only include tables that contain markers in their immediate content (excluding nested tables)
                // This prevents Layout Tables (which contain Data Tables) from being mapped
                if (IsTableWithMarkers(table))
                {
                    templateTables.Add(table);
                }
            }
        }

        // Strict Index Mapping: Map tables[i] to templateTables[i]
        int limit = Math.Min(tables.Count, templateTables.Count);
        for (int i = 0; i < limit; i++)
        {
            var tableData = tables[i];
            var table = templateTables[i];

            if (tableData == null || tableData.Rows == null || !tableData.Rows.Any()) continue;

            // Sort logic - REMOVED from here, moved to ProcessTableRows to apply AFTER Collapse/Group
            // try { ... } catch { ... }

            // Process the table directly
            ProcessTableRows(table, tableData, mainPart);
        }

        return Task.CompletedTask;
    }

    // private Task ProcessTableAsync(OpenXmlElement root, string tableName, TableData tableData)
    // {
    //     // Legacy method - removed or kept for backward compatibility if needed?
    //     // Since we changed the signature in ProcessTemplateAsync call, we can remove this or make it private/unused.
    //     // The user explicitly asked to REMOVE "table:key".
    //     return Task.CompletedTask;
    // }

    private void ProcessTableRows(Table table, TableData tableData, MainDocumentPart? mainPart = null)
    {
        var rows = tableData.Rows;
        if (rows == null || !rows.Any()) return;

        // 1. Identify the Data Template Row (the one with the most {{row:key}} markers)
        var keys = rows[0].Keys.Where(k => !string.IsNullOrEmpty(k)).ToList();
        TableRow? dataTemplateRow = null;
        int bestScore = -1;

        var tableRows = table.Elements<TableRow>().ToList();

        for (int i = 0; i < tableRows.Count; i++)
        {
            var row = tableRows[i];
            NormalizeAllPlaceholdersInElement(row); // Normalize placeholders first
            var rowText = row.InnerText;

            if (!rowText.Contains("{{")) continue;

            int score = 0;
            foreach (var key in keys)
            {
                if (rowText.Contains($"{{{{row:{key}}}}}") || rowText.Contains($"{{{{{key}}}}}"))
                {
                    score++;
                }
            }

            if (score > bestScore)
            {
                bestScore = score;
                dataTemplateRow = row;
            }
        }

        // Fallback: Use first row with any marker if no specific match
        if (dataTemplateRow == null || bestScore <= 0)
        {
            dataTemplateRow = tableRows.FirstOrDefault(r => r.InnerText.Contains("{{"));
        }

        if (dataTemplateRow == null) return;

        int dataRowIndex = tableRows.IndexOf(dataTemplateRow);

        // 2. Detect Grouping Configuration (MergeField)
        // Priority 1: API Configuration (VerticalMergeFields)
        List<string> mergeFields = tableData.VerticalMergeFields ?? new List<string>();
        // Support legacy single field property (though user asked to rename, we keep internal var logic clean)

        string? primaryGroupField = mergeFields.FirstOrDefault(); // The main group field for header/footer logic

        TableRow? groupHeaderTemplate = null;
        TableRow? groupFooterTemplate = null;
        bool useMerge = mergeFields.Any();
        List<int> mergeColIndices = new List<int>();

            // Priority 2: Inferred from Template (Legacy {{group:Field}}) - ONLY if no API config
            if (string.IsNullOrEmpty(primaryGroupField) && !mergeFields.Any())
            {
                string? inferredGroupField = null;
                // Check Data Template Row
                var dataRowGroupMatch = Regex.Match(dataTemplateRow.InnerText, @"\{\{group:([^}]+)\}\}");
                if (dataRowGroupMatch.Success)
                {
                    inferredGroupField = dataRowGroupMatch.Groups[1].Value.Trim();
                }

                // Check other rows
                if (string.IsNullOrEmpty(inferredGroupField))
                {
                    foreach (var row in tableRows)
                    {
                        var text = row.InnerText;
                        var groupMatch = Regex.Match(text, @"\{\{group:([^}]+)\}\}");
                        if (groupMatch.Success)
                        {
                            inferredGroupField = groupMatch.Groups[1].Value.Trim();
                            break;
                        }
                    }
                }

                if (!string.IsNullOrEmpty(inferredGroupField))
                {
                    // FIX: {{group:key}} should ONLY mean grouping (Header/Footer), NOT vertical merge.
                    // To merge, user must use API configuration or explicit {{merge:key}} (if supported later).
                    // mergeFields.Add(inferredGroupField); // <--- REMOVED: Do not auto-add to merge fields
                    primaryGroupField = inferredGroupField;
                    // useMerge = true; // <--- REMOVED: Grouping doesn't imply merging anymore
                }
            }

        // 3. Check for Data Collapsing (API Priority -> Marker Fallback)
        List<string> collapseFields = tableData.CollapseFields ?? new List<string>();

        if (!collapseFields.Any())
        {
            var templateText = dataTemplateRow.InnerText;
            var collapseMatch = Regex.Match(templateText, @"\{\{(?:group_collapse|collapse):([^}]+)\}\}");
            if (collapseMatch.Success)
            {
                collapseFields.Add(collapseMatch.Groups[1].Value.Trim());
            }
        }

        if (collapseFields.Any())
        {
            // Smart Collapse:
            // If we have merge fields, we MUST include them in the collapse key to preserve grouping structure.
            // Example: Merge "Category", Collapse "Date" -> Effective Collapse Key = "Category" + "Date"

            var effectiveCollapseFields = new List<string>();

            // Add all merge fields first (to maintain group integrity)
            foreach(var mf in mergeFields)
            {
                if (!effectiveCollapseFields.Contains(mf, StringComparer.OrdinalIgnoreCase))
                {
                    effectiveCollapseFields.Add(mf);
                }
            }

            // Add requested collapse fields
            foreach(var cf in collapseFields)
            {
                if (!effectiveCollapseFields.Contains(cf, StringComparer.OrdinalIgnoreCase))
                {
                    effectiveCollapseFields.Add(cf);
                }
            }

            rows = CollapseRows(rows, effectiveCollapseFields.ToArray());

            // Re-scan keys as they might have changed
            if (rows.Any())
            {
                keys = rows.SelectMany(r => r.Keys).Distinct().Where(k => !string.IsNullOrEmpty(k)).ToList();
            }
        }

        // 3.5 Auto-Sort Data
        // To ensure vertical merge and data collapsing works correctly, data SHOULD be sorted.
        // Priority 1: Vertical Merge Fields (Grouping)
        // Priority 2: Collapse Fields (Order within groups)

        var sortFields = new List<string>(mergeFields);
        foreach (var cf in collapseFields)
        {
            // Avoid duplicates
            if (!sortFields.Contains(cf, StringComparer.OrdinalIgnoreCase))
            {
                sortFields.Add(cf);
            }
        }

        // Check if explicit sort was applied
        bool explicitSortApplied = tableData.Sort != null && tableData.Sort.Any();

        if (explicitSortApplied)
        {
             // 3.5.1 Explicit Sort (User Configured) - Applied AFTER Collapse/Group
             try
             {
                 var sortDefinitions = new List<(string Field, bool Descending)>();
                 foreach (var sortDef in tableData.Sort!)
                 {
                     if (!string.IsNullOrWhiteSpace(sortDef.Field))
                     {
                         bool desc = sortDef.Direction?.Equals("desc", StringComparison.OrdinalIgnoreCase) == true;
                         sortDefinitions.Add((sortDef.Field, desc));
                     }
                 }

                 if (sortDefinitions.Any())
                 {
                     IOrderedEnumerable<Dictionary<string, object?>>? orderedRows = null;
                     var first = sortDefinitions[0];

                     if (first.Descending) orderedRows = rows.OrderByDescending(r => r.ContainsKey(first.Field) ? r[first.Field]?.ToString() : "");
                     else orderedRows = rows.OrderBy(r => r.ContainsKey(first.Field) ? r[first.Field]?.ToString() : "");

                     for (int j = 1; j < sortDefinitions.Count; j++)
                     {
                         var next = sortDefinitions[j];
                         if (next.Descending) orderedRows = orderedRows!.ThenByDescending(r => r.ContainsKey(next.Field) ? r[next.Field]?.ToString() : "");
                         else orderedRows = orderedRows!.ThenBy(r => r.ContainsKey(next.Field) ? r[next.Field]?.ToString() : "");
                     }
                     rows = orderedRows!.ToList();
                 }
             }
             catch (Exception ex)
             {
                 _logger.LogWarning(ex, "Failed to sort table data");
             }
        }
        else if (sortFields.Any() && rows.Count > 1)
        {
            // Sort by the identified fields in order
            var orderedRows = rows.OrderBy(r =>
                r.ContainsKey(sortFields[0]) ? r[sortFields[0]]?.ToString() : "");

            for (int i = 1; i < sortFields.Count; i++)
            {
                var field = sortFields[i];
                orderedRows = orderedRows.ThenBy(r =>
                    r.ContainsKey(field) ? r[field]?.ToString() : "");
            }

            rows = orderedRows.ToList();
        }

        // 4. Identify Roles (Header/Footer/Merge) based on primaryGroupField
        if (useMerge || !string.IsNullOrEmpty(primaryGroupField))
        {
            // A. Identify Vertical Merge Columns for ALL merge fields
            if (useMerge && mergeFields.Any())
            {
                var cells = dataTemplateRow.Elements<TableCell>().ToList();

                foreach (var field in mergeFields)
                {
                    for (int i = 0; i < cells.Count; i++)
                    {
                        var cellText = cells[i].InnerText;
                        // Match {{row:key}}, {{key}}, or {{group:key}}
                        if (cellText.Contains($"{{{{row:{field}}}}}") ||
                            cellText.Contains($"{{{{{field}}}}}") ||
                            cellText.Contains($"{{{{group:{field}}}}}"))
                        {
                            if (!mergeColIndices.Contains(i))
                            {
                                mergeColIndices.Add(i);
                            }
                        }
                    }
                }
            }

            // B. Identify Group Header/Footer (Only supported for the Primary Group Field currently)
            if (!string.IsNullOrEmpty(primaryGroupField))
            {
                // Check Row Above Data Row -> Header
                if (dataRowIndex > 0)
                {
                    var prevRow = tableRows[dataRowIndex - 1];
                    if (IsGroupTemplateRow(prevRow, primaryGroupField))
                    {
                        groupHeaderTemplate = prevRow;
                    }
                }

                // Check Rows Below Data Row -> Footer
                for (int i = dataRowIndex + 1; i < tableRows.Count; i++)
                {
                    var nextRow = tableRows[i];
                    if (IsGroupTemplateRow(nextRow, primaryGroupField))
                    {
                        groupFooterTemplate = nextRow;
                        break;
                    }
                }
            }
        }

        // 5. Process Rows
        var newRows = new List<TableRow>();

        // Track the last value for each merge field to determine if we should restart or continue merge
        var lastMergeValues = new Dictionary<string, string?>();
        foreach (var f in mergeFields) lastMergeValues[f] = null;

        string? lastPrimaryGroupValue = null; // For Header/Footer logic

        // Pre-calculate Aggregates (Count, Sum, Avg)
        // Scope: Table (Global) - Prefix: table_
        var tableAggregates = CalculateAggregates(rows, "table");

        // Scope: Group (Keyed by GroupValue) - Prefix: group_
        Dictionary<string, Dictionary<string, object?>> groupAggregates = new();

        if (!string.IsNullOrEmpty(primaryGroupField))
        {
            var groupedData = rows.GroupBy(r => r.ContainsKey(primaryGroupField) ? r[primaryGroupField]?.ToString() : "")
                                  .ToDictionary(g => g.Key ?? "", g => g.ToList());

            foreach (var group in groupedData)
            {
                groupAggregates[group.Key] = CalculateAggregates(group.Value, "group");
            }
        }

        // --- Process Static Rows (Table Headers/Footers) ---
        foreach (var r in table.Elements<TableRow>())
        {
            if (r == dataTemplateRow || r == groupHeaderTemplate || r == groupFooterTemplate) continue;

            if (r.InnerText.Contains("{{"))
            {
                NormalizeAllPlaceholdersInElement(r);
                ReplaceMarkersInRow(r, tableAggregates, isAggregateRow: true);
            }
        }

        foreach (var rowData in rows)
        {
            // Determine primary group value for Header/Footer
            string? currentPrimaryGroupValue = null;
            if (!string.IsNullOrEmpty(primaryGroupField) && rowData.TryGetValue(primaryGroupField, out var val))
            {
                currentPrimaryGroupValue = val?.ToString();
            }

            // Get group aggregate data (based on primary group)
            Dictionary<string, object?>? currentGroupAgg = null;
            if (currentPrimaryGroupValue != null && groupAggregates.TryGetValue(currentPrimaryGroupValue, out var aggData))
            {
                currentGroupAgg = aggData;
            }

            // Check if primary group changed (for Header/Footer)
            bool primaryGroupChanged = false;
            if (newRows.Count == 0) primaryGroupChanged = true;
            else if (currentPrimaryGroupValue != lastPrimaryGroupValue) primaryGroupChanged = true;

            // Handle Group Change (Footer for previous, Header for new)
            if (primaryGroupChanged)
            {
                // Footer for previous group
                if (newRows.Count > 0 && groupFooterTemplate != null)
                {
                     var newFooter = (TableRow)groupFooterTemplate.CloneNode(true);
                     NormalizeAllPlaceholdersInElement(newFooter);

                     // Use PREVIOUS group data for footer
                    if (lastPrimaryGroupValue != null && groupAggregates.TryGetValue(lastPrimaryGroupValue, out var prevAgg))
                    {
                        var footerData = new Dictionary<string, object?>(tableAggregates);
                        foreach(var kv in prevAgg) footerData[kv.Key] = kv.Value;

                        if (!string.IsNullOrEmpty(primaryGroupField))
                        {
                            footerData[primaryGroupField] = lastPrimaryGroupValue;
                        }

                        ReplaceMarkersInRow(newFooter, footerData, isAggregateRow: true);
                    }

                     newRows.Add(newFooter);
                }

                // Header for new group
                if (groupHeaderTemplate != null)
                {
                    var newHeader = (TableRow)groupHeaderTemplate.CloneNode(true);
                    NormalizeAllPlaceholdersInElement(newHeader);

                    var headerData = new Dictionary<string, object?>(rowData);
                    foreach(var kv in tableAggregates) headerData[kv.Key] = kv.Value;

                    if (currentGroupAgg != null)
                    {
                        foreach (var kvp in currentGroupAgg) headerData[kvp.Key] = kvp.Value;
                    }

                    ReplaceMarkersInRow(newHeader, headerData, isAggregateRow: true);
                    newRows.Add(newHeader);
                }
            }

            // Data Row
            var newRow = (TableRow)dataTemplateRow.CloneNode(true);
            NormalizeAllPlaceholdersInElement(newRow);

            // Handle Vertical Merge for EACH merge field independently
            if (useMerge && mergeColIndices.Any())
            {
                var cells = newRow.Elements<TableCell>().ToList();

                // We need to determine if a merge should restart or continue for each field.
                // A merge restarts if:
                // 1. It's the first row
                // 2. The value of the field has changed from the previous row
                // 3. Any PARENT group (field defined before it in the list) has changed/restarted.
                //    (This implies a hierarchy: if Category changes, Item Name must restart merge even if name is same)

                bool parentChanged = false; // Tracks if any higher-level group changed

                foreach (var field in mergeFields)
                {
                    // Get current value
                    string? currentVal = rowData.ContainsKey(field) ? rowData[field]?.ToString() : null;
                    string? lastVal = lastMergeValues[field];

                    bool valueChanged = currentVal != lastVal;
                    bool shouldRestart = (newRows.Count == 0) || valueChanged || parentChanged;

                    if (shouldRestart)
                    {
                        parentChanged = true; // Propagate change to child groups
                        lastMergeValues[field] = currentVal; // Update last value
                    }

                    // Apply to all columns mapped to this field
                    for (int i = 0; i < cells.Count; i++)
                    {
                        // Check if this column is mapped to the current field
                        // We re-check the content pattern here or we could have stored a map earlier.
                        // For simplicity and safety against index shifts, let's check the cell content in template again?
                        // No, that's slow. We should rely on indices, but we need to know WHICH field maps to WHICH index.
                        // Let's optimize: In step 4, we built mergeColIndices but lost the field mapping.
                        // Let's do a quick check here or better, build a map in Step 4.

                        // Re-scanning here is safer given the structure
                        var cell = cells[i];
                        // We can't check 'cell.InnerText' of newRow because it hasn't been replaced yet!
                        // We must rely on the index mapping from the Template Row.
                        // But wait, we didn't store index->field map.

                        // Let's check the TEMPLATE row cells at this index
                        var templateCell = dataTemplateRow.Elements<TableCell>().ElementAtOrDefault(i);
                        if (templateCell == null) continue;

                        var templateText = templateCell.InnerText;
                        bool isThisField = templateText.Contains($"{{{{row:{field}}}}}") ||
                                           templateText.Contains($"{{{{{field}}}}}") ||
                                           templateText.Contains($"{{{{group:{field}}}}}");

                        if (isThisField)
                        {
                             var cellProps = cell.TableCellProperties;
                            if (cellProps == null)
                            {
                                cellProps = new TableCellProperties();
                                cell.TableCellProperties = cellProps;
                            }

                            if (shouldRestart)
                            {
                                cellProps.VerticalMerge = new VerticalMerge { Val = MergedCellValues.Restart };
                            }
                            else
                            {
                                cellProps.VerticalMerge = new VerticalMerge(); // Continue
                                // Clear content for cleaner look in continued cells
                                cell.RemoveAllChildren<Paragraph>();
                                cell.AppendChild(new Paragraph());
                            }
                        }
                    }
                }
            }

            // Merge aggregates into row data
            var effectiveRowData = new Dictionary<string, object?>(rowData);
            foreach (var kv in tableAggregates) effectiveRowData[kv.Key] = kv.Value;
            if (currentGroupAgg != null)
            {
                foreach (var kv in currentGroupAgg) effectiveRowData[kv.Key] = kv.Value;
            }

            ReplaceMarkersInRow(newRow, effectiveRowData);
            newRows.Add(newRow);

            lastPrimaryGroupValue = currentPrimaryGroupValue;
        }

        // Handle Footer for the very last group
        if (groupFooterTemplate != null && newRows.Count > 0)
        {
             var newFooter = (TableRow)groupFooterTemplate.CloneNode(true);
             NormalizeAllPlaceholdersInElement(newFooter);
             if (lastPrimaryGroupValue != null && groupAggregates.TryGetValue(lastPrimaryGroupValue, out var lastAgg))
             {
                 var footerData = new Dictionary<string, object?>(tableAggregates);
                 foreach(var kv in lastAgg) footerData[kv.Key] = kv.Value;

                 // Ensure Group Key is available in Footer
                 if (!string.IsNullOrEmpty(primaryGroupField))
                 {
                     footerData[primaryGroupField] = lastPrimaryGroupValue;
                 }

                 ReplaceMarkersInRow(newFooter, footerData, isAggregateRow: true);
             }
             newRows.Add(newFooter);
        }

        // 4. Cleanup and Insert
        var parent = dataTemplateRow.Parent;
        if (parent != null)
        {
            // Insert all new rows before the Data Template Row
            foreach (var newRow in newRows)
            {
                parent.InsertBefore(newRow, dataTemplateRow);
            }

            // Remove templates
            dataTemplateRow.Remove();
            if (groupHeaderTemplate != null && groupHeaderTemplate.Parent == parent) groupHeaderTemplate.Remove();
            if (groupFooterTemplate != null && groupFooterTemplate.Parent == parent) groupFooterTemplate.Remove();
        }

        // Apply repeat header if requested
        if (tableData.RepeatHeader && dataRowIndex > 0)
        {
            var currentRows = table.Elements<TableRow>().ToList();
            int headerCount = Math.Min(dataRowIndex, currentRows.Count);
            for (int i = 0; i < headerCount; i++)
            {
                var headerRow = currentRows[i];
                var rowProps = headerRow.TableRowProperties;
                if (rowProps == null)
                {
                    rowProps = new TableRowProperties();
                    headerRow.PrependChild(rowProps);
                }
                if (!rowProps.Elements<TableHeader>().Any())
                    rowProps.Append(new TableHeader());
            }
        }

        // Ensure all table rows can break across pages (prevents last-row cutoff in LibreOffice/Gotenberg)
        foreach (var row in table.Elements<TableRow>())
        {
            var rowProps = row.TableRowProperties;
            if (rowProps == null)
            {
                rowProps = new TableRowProperties();
                row.PrependChild(rowProps);
            }

            var cantSplit = rowProps.GetFirstChild<CantSplit>();
            if (cantSplit != null) cantSplit.Remove();
        }

        // Ensure every cell has an explicit bottom border so page breaks render borders correctly.
        // LibreOffice may not render table-level InsideHorizontalBorder at page break boundaries.
        EnsureExplicitCellBottomBorders(table, mainPart);
    }

    private static void EnsureExplicitCellBottomBorders(Table table, MainDocumentPart? mainPart = null)
    {
        // 1. Try inline table borders
        var tableBorders = table.GetFirstChild<TableProperties>()?.GetFirstChild<TableBorders>();
        var refBorder = (OpenXmlElement?)tableBorders?.GetFirstChild<InsideHorizontalBorder>()
                     ?? tableBorders?.GetFirstChild<BottomBorder>();

        // 2. Try table style borders (theme-based tables define borders here)
        if (refBorder == null && mainPart != null)
        {
            var styleId = table.GetFirstChild<TableProperties>()?.GetFirstChild<TableStyle>()?.Val?.Value;
            if (styleId != null)
            {
                var style = mainPart.StyleDefinitionsPart?.Styles?
                    .Elements<Style>()
                    .FirstOrDefault(s => s.StyleId == styleId);
                var styleBorders = style?.StyleTableProperties?.GetFirstChild<TableBorders>();
                refBorder = (OpenXmlElement?)styleBorders?.GetFirstChild<InsideHorizontalBorder>()
                         ?? styleBorders?.GetFirstChild<BottomBorder>();
            }
        }

        // 3. Fallback: find any existing cell border as reference
        if (refBorder == null)
        {
            refBorder = FindCellBorderReference(table);
        }

        foreach (var row in table.Elements<TableRow>())
        {
            foreach (var cell in row.Elements<TableCell>())
            {
                var cellProps = cell.TableCellProperties;
                if (cellProps == null)
                {
                    cellProps = new TableCellProperties();
                    cell.PrependChild(cellProps);
                }

                var cellBorders = cellProps.TableCellBorders;
                if (cellBorders == null)
                {
                    cellBorders = new TableCellBorders();
                    cellProps.AppendChild(cellBorders);
                }

                var bb = cellBorders.BottomBorder;
                if (bb == null || bb.Val == null || bb.Val == BorderValues.None || bb.Val == BorderValues.Nil)
                {
                    cellBorders.BottomBorder = CloneBorderAsBottom(refBorder);
                }
            }
        }
    }

    private static BottomBorder CloneBorderAsBottom(OpenXmlElement? refBorder)
    {
        var border = new BottomBorder
        {
            Val = BorderValues.Single,
            Size = 4,
            Color = "000000",
            Space = 0
        };

        if (refBorder == null) return border;

        // Copy all border attributes from the reference (handles Color, ThemeColor, ThemeTint, ThemeShade, etc.)
        foreach (var attr in refBorder.GetAttributes())
        {
            border.SetAttribute(attr);
        }

        return border;
    }

    private static OpenXmlElement? FindCellBorderReference(Table table)
    {
        foreach (var row in table.Elements<TableRow>())
        {
            foreach (var cell in row.Elements<TableCell>())
            {
                var borders = cell.TableCellProperties?.TableCellBorders;
                if (borders == null) continue;

                // Priority: BottomBorder → TopBorder → LeftBorder → RightBorder
                OpenXmlElement?[] candidates = {
                    borders.BottomBorder,
                    borders.TopBorder,
                    borders.LeftBorder,
                    borders.RightBorder
                };

                var found = candidates.FirstOrDefault(b =>
                    b != null &&
                    b.GetAttributes().Any(a => a.LocalName == "val") &&
                    b.GetAttributes().All(a => a.LocalName != "val" ||
                        (a.Value != "none" && a.Value != "nil")));

                if (found != null) return found;
            }
        }
        return null;
    }

    private Dictionary<string, object?> CalculateAggregates(List<Dictionary<string, object?>> rows, string scopePrefix)
    {
        var result = new Dictionary<string, object?>();
        if (rows == null || !rows.Any()) return result;

        result[$"{scopePrefix}_count"] = rows.Count;

        // Accumulators for Sum and Count
        // Use a single pass to handle sparse data correctly
        var sums = new Dictionary<string, double>();
        var counts = new Dictionary<string, int>();

        foreach (var row in rows)
        {
            foreach (var kv in row)
            {
                var key = kv.Key;
                var val = kv.Value;

                if (string.IsNullOrEmpty(key) || val == null) continue;

                if (double.TryParse(val.ToString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double num))
                {
                    if (!sums.ContainsKey(key)) sums[key] = 0;
                    if (!counts.ContainsKey(key)) counts[key] = 0;

                    sums[key] += num;
                    counts[key]++;
                }
            }
        }

        // Populate result
        foreach (var key in sums.Keys)
        {
            var sum = sums[key];
            var count = counts[key];

            if (count > 0)
            {
                result[$"{scopePrefix}_sum:{key}"] = sum;
                result[$"{scopePrefix}_avg:{key}"] = sum / count;
            }
        }

        return result;
    }

    private bool IsGroupTemplateRow(TableRow row, string groupField)
    {
        var text = row.InnerText;
        // Contains group key: {{group:key}}
        if (text.Contains($"{{{{group:{groupField}}}}}"))
            return true;

        // Contains any group aggregate: {{group_sum:..}}, {{group_avg:..}}, {{group_count}}, {{group_min:..}}, {{group_max:..}}
        // Or collapse marker: {{group_collapse:..}}
        if (text.Contains("{{group_sum:") || text.Contains("{{group_avg:") ||
            text.Contains("{{group_count") || text.Contains("{{group_min:") ||
            text.Contains("{{group_max:") || text.Contains("{{group_collapse:"))
            return true;

        return false;
    }

    private void ReplaceMarkersInRow(TableRow row, Dictionary<string, object?> rowData, bool isAggregateRow = false)
    {
        foreach (var cell in row.Descendants<TableCell>())
        {
            // Simple replacement
            var textElements = cell.Descendants<Text>().ToList();
            foreach (var text in textElements)
            {
                var content = text.Text;

                // 1. Handle Dynamic Row Aggregates (Horizontal)
                // Pattern: {{row_sum:field1,field2}} or {{row_avg:field1,field2}}
                if (content.Contains("{{row_sum:") || content.Contains("{{row_avg:"))
                {
                    content = ProcessRowAggregates(content, rowData);
                }

                // 2. Handle Dynamic Group/Table Aggregates (Multi-key support)
                // Pattern: {{group_sum:f1,f2}}, {{table_avg:f1,f2}}
                if (content.Contains("{{group_sum:") || content.Contains("{{table_sum:") ||
                    content.Contains("{{group_avg:") || content.Contains("{{table_avg:"))
                {
                    content = ProcessGroupTableAggregates(content, rowData);
                }

                foreach (var (key, val) in rowData)
                {
                    // Filter: Only replace if value is not null/empty
                    var valueStr = val?.ToString();
                    if (valueStr == null) valueStr = "";

                    // Standard Markers: {{row:key}}
                    var markerRow = $"{{{{row:{key}}}}}";
                    if (content.Contains(markerRow))
                    {
                        content = content.Replace(markerRow, valueStr);
                    }

                    // Group Markers: {{group:key}}
                    var markerGroup = $"{{{{group:{key}}}}}";
                    if (content.Contains(markerGroup))
                    {
                        content = content.Replace(markerGroup, valueStr);
                    }

                    // Aggregate Markers (only for Header/Footer/Aggregate contexts)
                    // Format: {{table_count}}, {{table_sum:price}}, {{group_avg:score}}
                    if (isAggregateRow)
                    {
                         var markerAgg = $"{{{{{key}}}}}";
                         if (content.Contains(markerAgg))
                         {
                             // Format numbers if needed? For now just toString
                             // Maybe support formatting like {{table_sum:price:N2}} later
                             content = content.Replace(markerAgg, valueStr);
                         }
                    }
                }
                text.Text = content;
                text.Space = SpaceProcessingModeValues.Preserve;
            }
        }
    }

    private string ProcessRowAggregates(string content, Dictionary<string, object?> rowData)
    {
        // Simple parser for {{row_sum:f1,f2}} and {{row_avg:f1,f2}}
        // Loop until no more markers found
        while (content.Contains("{{row_sum:") || content.Contains("{{row_avg:"))
        {
            int startIndex = content.IndexOf("{{row_");
            if (startIndex == -1) break;

            int endIndex = content.IndexOf("}}", startIndex);
            if (endIndex == -1) break;

            string tag = content.Substring(startIndex, endIndex - startIndex + 2);
            string inner = tag.Substring(2, tag.Length - 4); // Remove {{ and }}

            // inner: "row_sum:f1,f2"
            var parts = inner.Split(':');
            if (parts.Length >= 2)
            {
                string op = parts[0].Trim(); // row_sum or row_avg
                string fieldsStr = parts[1]; // f1,f2
                var fields = fieldsStr.Split(',');

                double sum = 0;
                int count = 0;

                foreach (var f in fields)
                {
                    var fieldName = f.Trim();
                    if (rowData.TryGetValue(fieldName, out var val) && val != null)
                    {
                        if (double.TryParse(val.ToString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double num))
                        {
                            sum += num;
                            count++;
                        }
                    }
                }

                string result = "";
                if (op == "row_sum") result = sum.ToString();
                else if (op == "row_avg" && count > 0) result = (sum / count).ToString();
                else if (op == "row_avg") result = "0";

                content = content.Replace(tag, result);
            }
            else
            {
                // Invalid format, just break to avoid infinite loop
                break;
            }
        }
        return content;
    }

    private string ProcessGroupTableAggregates(string content, Dictionary<string, object?> rowData)
    {
        // Handles dynamic aggregation of multiple fields: {{group_sum:price,tax}} or {{table_avg:score,bonus}}
        // Supported prefixes: group_sum, table_sum, group_avg, table_avg
        string[] prefixes = new[] { "group_sum", "table_sum", "group_avg", "table_avg" };

        foreach (var prefix in prefixes)
        {
            string markerStart = $"{{{{{prefix}:";
            while (content.Contains(markerStart))
            {
                int startIndex = content.IndexOf(markerStart);
                if (startIndex == -1) break;

                int endIndex = content.IndexOf("}}", startIndex);
                if (endIndex == -1) break;

                string tag = content.Substring(startIndex, endIndex - startIndex + 2);
                string inner = tag.Substring(2, tag.Length - 4); // Remove {{ and }}

                // inner: "group_sum:key1,key2"
                var parts = inner.Split(':');
                if (parts.Length >= 2)
                {
                    string op = parts[0].Trim(); // group_sum, table_sum, etc.
                    string fieldsStr = parts[1]; // f1,f2
                    var fields = fieldsStr.Split(',');

                    double sum = 0;
                    int count = 0;
                    bool foundAny = false;

                    foreach (var f in fields)
                    {
                        var fieldName = f.Trim();
                        // Look up the pre-calculated aggregate in rowData
                        // The key in rowData is e.g. "group_sum:price" or "table_avg:score"
                        string dataKey = $"{op}:{fieldName}";

                        if (rowData.TryGetValue(dataKey, out var val) && val != null)
                        {
                            if (double.TryParse(val.ToString(), out double num))
                            {
                                sum += num;
                                count++;
                                foundAny = true;
                            }
                        }
                    }

                    // For "sum", we just sum the values.
                    // For "avg", we sum the averages (assuming equal weights? No, Avg(A+B) = Avg(A)+Avg(B)).
                    // Wait, Avg(A+B) = (SumA + SumB) / N = SumA/N + SumB/N = AvgA + AvgB.
                    // So simply summing the pre-calculated averages works perfectly for "average of sum".
                    // If the user meant "Average of (A, B)" -> (SumA + SumB) / (N + N), that's different.
                    // But usually in reports, row_avg:A,B means (A+B)/2 per row.
                    // Here, group_avg:A,B likely means Average of (A+B) per group.
                    // So Sum(AvgA, AvgB) is correct.

                    string result = foundAny ? sum.ToString() : "0";
                    content = content.Replace(tag, result);
                }
                else
                {
                    // Invalid format, prevent infinite loop
                    content = content.Replace(tag, "");
                }
            }
        }
        return content;
    }

    private static bool IsTableWithMarkers(Table table)
    {
        // Check if the table contains any markers in its immediate content
        // We iterate rows -> cells -> paragraphs -> text
        // We intentionally do NOT use table.InnerText because it includes nested tables.
        foreach (var row in table.Elements<TableRow>())
        {
            foreach (var cell in row.Elements<TableCell>())
            {
                foreach (var p in cell.Elements<Paragraph>())
                {
                    // Check text in paragraph
                    // We can use InnerText of paragraph as it does not contain nested tables (tables are siblings)
                    if (p.InnerText.Contains("{{")) return true;
                }
            }
        }
        return false;
    }

    private void NormalizeAllPlaceholdersInElement(OpenXmlElement element)
    {
         foreach (var paragraph in element.Descendants<Paragraph>())
        {
            NormalizeAllPlaceholders(paragraph);
        }
    }

    // ... Helper Methods ...

    private ImagePart AddImageToPart(OpenXmlPart part, string imagePartTypeLiteral)
    {
        var type = ImagePartType.Png;
        if (imagePartTypeLiteral.Contains("jpeg") || imagePartTypeLiteral.Contains("jpg")) type = ImagePartType.Jpeg;
        else if (imagePartTypeLiteral.Contains("gif")) type = ImagePartType.Gif;
        else if (imagePartTypeLiteral.Contains("bmp")) type = ImagePartType.Bmp;
        else if (imagePartTypeLiteral.Contains("tiff")) type = ImagePartType.Tiff;
        else if (imagePartTypeLiteral.Contains("icon")) type = ImagePartType.Icon;
        else if (imagePartTypeLiteral.Contains("pcx")) type = ImagePartType.Pcx;
        else if (imagePartTypeLiteral.Contains("emf")) type = ImagePartType.Emf;
        else if (imagePartTypeLiteral.Contains("wmf")) type = ImagePartType.Wmf;

        if (part is MainDocumentPart main) return main.AddImagePart(type);
        if (part is HeaderPart header) return header.AddImagePart(type);
        if (part is FooterPart footer) return footer.AddImagePart(type);
        throw new InvalidOperationException($"Unsupported part type for image addition: {part.GetType().Name}");
    }

    private async Task<byte[]> GetImageBytesAsync(ImageData imageData, CancellationToken cancellationToken)
    {
        var src = imageData.Src?.Trim();
        if (string.IsNullOrWhiteSpace(src)) return Array.Empty<byte>();

        // Handle minio: paths — resolve to presigned URL then download
        if (src.StartsWith("minio:", StringComparison.OrdinalIgnoreCase))
        {
            var presignedUrl = await _storageService.ResolveMinioPathAsync(src);
            var httpClient = _httpClientFactory.CreateClient();
            return await httpClient.GetByteArrayAsync(presignedUrl, cancellationToken);
        }

        if (src.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            var httpClient = _httpClientFactory.CreateClient();
            // Add User-Agent to avoid being blocked by some servers
            if (!httpClient.DefaultRequestHeaders.Contains("User-Agent"))
            {
                httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            }
            return await httpClient.GetByteArrayAsync(src, cancellationToken);
        }
        else
        {
            if (src.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                var commaIndex = src.IndexOf(',');
                if (commaIndex > 0) src = src.Substring(commaIndex + 1);
            }
            try { return Convert.FromBase64String(src); }
            catch (FormatException ex) {
                _logger.LogWarning(ex, "Failed to parse base64 string for image");
                throw new ArgumentException("Invalid image source", ex);
            }
        }
    }

    private List<Dictionary<string, object?>> CollapseRows(List<Dictionary<string, object?>> rows, params string[] groupFields)
    {
        if (rows == null || !rows.Any() || groupFields == null || groupFields.Length == 0) return rows ?? new();

        // Group by composite key
        var grouped = rows.GroupBy(r =>
        {
            var keyParts = groupFields.Select(f => r.ContainsKey(f) ? r[f]?.ToString() ?? "" : "");
            return string.Join("|<|>", keyParts); // Use a separator that is unlikely to be in data
        }).ToList();

        var collapsedRows = new List<Dictionary<string, object?>>();

        // Determine all unique keys from all rows (schema)
        var allKeys = rows.SelectMany(r => r.Keys).Distinct().ToList();

        foreach (var group in grouped)
        {
            var newRow = new Dictionary<string, object?>();

            // Initialize with the group keys from the first item in the group
            var firstItem = group.First();
            foreach (var f in groupFields)
            {
                if (firstItem.ContainsKey(f))
                {
                    newRow[f] = firstItem[f];
                }
            }

            foreach (var key in allKeys)
            {
                if (groupFields.Contains(key)) continue;

                // Check if all values in this group for this key are numeric
                bool isNumeric = true;
                var values = new List<double>();

                foreach (var r in group)
                {
                    if (r.TryGetValue(key, out var val) && val != null)
                    {
                        if (double.TryParse(val.ToString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double num))
                        {
                            values.Add(num);
                        }
                        else if (!string.IsNullOrWhiteSpace(val.ToString()))
                        {
                            isNumeric = false;
                            break;
                        }
                    }
                }

                if (isNumeric && values.Any())
                {
                    newRow[key] = values.Sum();
                }
                else
                {
                    // For non-numeric or mixed, take the first non-null value
                    var firstVal = group.FirstOrDefault(r => r.ContainsKey(key) && r[key] != null)?[key];
                    newRow[key] = firstVal;
                }
            }
            collapsedRows.Add(newRow);
        }

        return collapsedRows;
    }

    private static void NormalizePlaceholderRuns(OpenXmlElement scope, string placeholder)
    {
        foreach (var paragraph in scope.Descendants<Paragraph>())
        {
            while (NormalizePlaceholderInParagraph(paragraph, placeholder)) { }
        }
    }

    private static bool NormalizePlaceholderInParagraph(Paragraph paragraph, string placeholder)
    {
        var runs = paragraph.Elements<Run>().ToList();
        if (runs.Count == 0) return false;

        var runInfos = new List<(Run Run, int Start, string Text)>();
        var builder = new StringBuilder();
        var position = 0;

        foreach (var run in runs)
        {
            var textValue = GetRunText(run);
            runInfos.Add((run, position, textValue));
            builder.Append(textValue);
            position += textValue.Length;
        }

        var combined = builder.ToString();
        var index = combined.IndexOf(placeholder, StringComparison.Ordinal);
        if (index < 0) return false;

        var endIndex = index + placeholder.Length;
        var firstIndex = runInfos.FindIndex(info => info.Start + info.Text.Length > index);
        var lastIndex = runInfos.FindLastIndex(info => info.Start < endIndex);

        if (firstIndex < 0 || lastIndex < 0) return false;

        var firstInfo = runInfos[firstIndex];
        var lastInfo = runInfos[lastIndex];

        var firstRelativeStart = Math.Max(index - firstInfo.Start, 0);
        var lastRelativeEnd = Math.Max(endIndex - lastInfo.Start, 0);

        var prefix = firstInfo.Text.Substring(0, Math.Min(firstRelativeStart, firstInfo.Text.Length));
        var suffix = lastInfo.Text.Substring(Math.Min(lastRelativeEnd, lastInfo.Text.Length));

        if (firstIndex == lastIndex && firstRelativeStart == 0 && suffix.Length == 0 &&
            string.Equals(firstInfo.Text, placeholder, StringComparison.Ordinal))
        {
            return false;
        }

        var templateProperties = firstInfo.Run.RunProperties?.CloneNode(true) as RunProperties;

        if (firstIndex == lastIndex)
        {
            var originalRun = firstInfo.Run;
            if (firstRelativeStart == 0) SetRunText(originalRun, placeholder);
            else
            {
                SetRunText(originalRun, prefix);
                var placeholderRun = CreateRunWithText(templateProperties, placeholder);
                originalRun.InsertAfterSelf(placeholderRun);
                originalRun = placeholderRun;
            }

            if (!string.IsNullOrEmpty(suffix))
            {
                var suffixRun = CreateRunWithText(templateProperties, suffix);
                originalRun.InsertAfterSelf(suffixRun);
            }
        }
        else
        {
            if (firstRelativeStart > 0)
            {
                SetRunText(firstInfo.Run, prefix);
                var placeholderRun = CreateRunWithText(templateProperties, placeholder);
                firstInfo.Run.InsertAfterSelf(placeholderRun);
            }
            else
            {
                SetRunText(firstInfo.Run, placeholder);
            }

            for (var i = firstIndex + 1; i < lastIndex; i++)
            {
                SetRunText(runInfos[i].Run, string.Empty);
            }
            SetRunText(lastInfo.Run, suffix);
        }

        RemoveEmptyRuns(paragraph);
        return true;
    }

    private static IEnumerable<Run> FindPlaceholderRuns(OpenXmlElement element, string placeholder)
    {
        return element.Descendants<Run>()
            .Where(run => string.Equals(GetRunText(run), placeholder, StringComparison.Ordinal));
    }

    private static string GetRunText(Run run)
    {
        return string.Concat(run.Elements<Text>().Select(t => t.Text ?? string.Empty));
    }

    private static void SetRunText(Run run, string? value)
    {
        var props = run.RunProperties?.CloneNode(true) as RunProperties;
        run.RemoveAllChildren();
        if (props != null) run.RunProperties = props;

        if (!string.IsNullOrEmpty(value))
        {
            var text = new Text(value);
            text.Space = SpaceProcessingModeValues.Preserve;
            run.AppendChild(text);
        }
    }

    private static Run CreateRunWithText(RunProperties? templateProperties, string? value)
    {
        var run = new Run();
        if (templateProperties != null) run.RunProperties = (RunProperties)templateProperties.CloneNode(true);
        if (!string.IsNullOrEmpty(value))
        {
            var text = new Text(value);
            text.Space = SpaceProcessingModeValues.Preserve;
            run.AppendChild(text);
        }
        return run;
    }

    private static void RemoveEmptyRuns(OpenXmlElement scope)
    {
        foreach (var run in scope.Descendants<Run>().ToList())
        {
            var hasText = run.Elements<Text>().Any(t => !string.IsNullOrEmpty(t.Text));
            var hasOtherContent = run.Elements().Any(e => e is not RunProperties && e is not Text);
            if (!hasText && !hasOtherContent) run.Remove();
        }
    }

    private static Drawing CreateImageDrawing(string relationshipId, long widthEmus, long heightEmus, long? cropL = null, long? cropT = null, long? cropR = null, long? cropB = null)
    {
        var imageId = (UInt32Value)(DateTime.Now.Ticks % uint.MaxValue); // Simple unique ID

        var blipFill = new PIC.BlipFill(
            new A.Blip { Embed = relationshipId, CompressionState = A.BlipCompressionValues.Print }
        );

        // Add SourceRectangle if cropping is requested
        // Note: For OpenXML SourceRectangle, values are percentages in 1/100000th units.
        // e.g., 50000 means 50%.
        if (cropL.HasValue || cropT.HasValue || cropR.HasValue || cropB.HasValue)
        {
            var srcRect = new A.SourceRectangle();
            if (cropL.HasValue) srcRect.Left = (int)cropL.Value;
            if (cropT.HasValue) srcRect.Top = (int)cropT.Value;
            if (cropR.HasValue) srcRect.Right = (int)cropR.Value;
            if (cropB.HasValue) srcRect.Bottom = (int)cropB.Value;
            blipFill.Append(srcRect);
        }

        blipFill.Append(new A.Stretch(new A.FillRectangle()));

        var inline = new DocumentFormat.OpenXml.Drawing.Wordprocessing.Inline(
            new DocumentFormat.OpenXml.Drawing.Wordprocessing.Extent { Cx = widthEmus, Cy = heightEmus },
            new DocumentFormat.OpenXml.Drawing.Wordprocessing.EffectExtent { LeftEdge = 0L, TopEdge = 0L, RightEdge = 0L, BottomEdge = 0L },
            new DocumentFormat.OpenXml.Drawing.Wordprocessing.DocProperties { Id = imageId, Name = $"Image{imageId}" },
            new DocumentFormat.OpenXml.Drawing.Wordprocessing.NonVisualGraphicFrameDrawingProperties(new A.GraphicFrameLocks { NoChangeAspect = true }),
            new A.Graphic(
                new A.GraphicData(
                    new PIC.Picture(
                        new PIC.NonVisualPictureProperties(
                            new PIC.NonVisualDrawingProperties { Id = 0U, Name = $"Image{imageId}" },
                            new PIC.NonVisualPictureDrawingProperties()
                        ),
                        blipFill,
                        new PIC.ShapeProperties(
                            new A.Transform2D(
                                new A.Offset { X = 0L, Y = 0L },
                                new A.Extents { Cx = widthEmus, Cy = heightEmus }
                            ),
                            new A.PresetGeometry(new A.AdjustValueList()) { Preset = A.ShapeTypeValues.Rectangle }
                        )
                    )
                ) { Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture" }
            )
        ) { DistanceFromTop = 0U, DistanceFromBottom = 0U, DistanceFromLeft = 0U, DistanceFromRight = 0U };

        return new Drawing(inline);
    }

    private static string DetectImagePartType(byte[] imageBytes)
    {
        if (imageBytes.Length >= 8)
        {
            if (imageBytes[0] == 0x89 && imageBytes[1] == 0x50 && imageBytes[2] == 0x4E && imageBytes[3] == 0x47) return "image/png";
            if (imageBytes[0] == 0xFF && imageBytes[1] == 0xD8 && imageBytes[2] == 0xFF) return "image/jpeg";
            if (imageBytes[0] == 0x47 && imageBytes[1] == 0x49 && imageBytes[2] == 0x46 && imageBytes[3] == 0x38) return "image/gif";
            if (imageBytes[0] == 0x42 && imageBytes[1] == 0x4D) return "image/bmp";
            if (imageBytes[0] == 0x49 && imageBytes[1] == 0x49 && imageBytes[2] == 0x2A && imageBytes[3] == 0x00) return "image/tiff";
        }
        return "image/png";
    }

    private static (long widthEmus, long heightEmus) CalculateImageDimensions(byte[] imageBytes, int? requestedWidth, int? requestedHeight, string? objectFit = null)
    {
        const long emuPerPixel = 9525;
        var (originalWidth, originalHeight) = GetImageDimensions(imageBytes);
        var originalWidthEmu = originalWidth * emuPerPixel;
        var originalHeightEmu = originalHeight * emuPerPixel;

        if (requestedWidth.HasValue && requestedHeight.HasValue)
        {
            var requestedWidthEmu = requestedWidth.Value * emuPerPixel;
            var requestedHeightEmu = requestedHeight.Value * emuPerPixel;
            if (!string.IsNullOrEmpty(objectFit))
                return CalculateFittedDimensions(originalWidthEmu, originalHeightEmu, requestedWidthEmu, requestedHeightEmu, objectFit);
            return (requestedWidthEmu, requestedHeightEmu);
        }

        if (requestedWidth.HasValue)
        {
            var requestedWidthEmu = requestedWidth.Value * emuPerPixel;
            var scaleRatio = (double)requestedWidthEmu / originalWidthEmu;
            return (requestedWidthEmu, (long)(originalHeightEmu * scaleRatio));
        }

        if (requestedHeight.HasValue)
        {
            var requestedHeightEmu = requestedHeight.Value * emuPerPixel;
            var scaleRatio = (double)requestedHeightEmu / originalHeightEmu;
            return ((long)(originalWidthEmu * scaleRatio), requestedHeightEmu);
        }

        return (originalWidthEmu, originalHeightEmu);
    }

    private static (long width, long height) CalculateFittedDimensions(long originalWidth, long originalHeight, long targetWidth, long targetHeight, string objectFit)
    {
        var widthRatio = (double)targetWidth / originalWidth;
        var heightRatio = (double)targetHeight / originalHeight;

        return objectFit.ToLowerInvariant() switch
        {
            "cover" => ((long)(originalWidth * Math.Max(widthRatio, heightRatio)),
                        (long)(originalHeight * Math.Max(widthRatio, heightRatio))),
            "fill" => (targetWidth, targetHeight),
            "contain" or _ => ((long)(originalWidth * Math.Min(widthRatio, heightRatio)),
                               (long)(originalHeight * Math.Min(widthRatio, heightRatio)))
        };
    }

    private static (int width, int height) GetImageDimensions(byte[] imageBytes)
    {
        try
        {
            using var ms = new MemoryStream(imageBytes);
            using var image = SKBitmap.Decode(ms);
            return image != null ? (image.Width, image.Height) : (100, 100);
        }
        catch
        {
            return (100, 100);
        }
    }

    /// <summary>
    /// Optimizes all images already embedded in the template document.
    /// Resizes oversized images to match their display dimensions and re-encodes for smaller file size.
    /// This significantly reduces the DOCX file size sent to Gotenberg, speeding up PDF conversion.
    /// </summary>
    private void OptimizeEmbeddedImages(MainDocumentPart mainPart)
    {
        const long emuPerPixel = 9525;
        int optimizedCount = 0;
        long totalSaved = 0;

        // Collect all parts that may contain images (main, headers, footers)
        var partsToProcess = new List<OpenXmlPart> { mainPart };
        partsToProcess.AddRange(mainPart.HeaderParts);
        partsToProcess.AddRange(mainPart.FooterParts);

        foreach (var part in partsToProcess)
        {
            // Find all Blip elements that reference images
            var rootElement = part switch
            {
                MainDocumentPart mdp => (OpenXmlElement?)mdp.Document,
                HeaderPart hp => hp.Header,
                FooterPart fp => fp.Footer,
                _ => null
            };
            if (rootElement == null) continue;

            var blips = rootElement.Descendants<A.Blip>().ToList();
            foreach (var blip in blips)
            {
                if (string.IsNullOrEmpty(blip.Embed?.Value)) continue;

                try
                {
                    var imagePart = (ImagePart)part.GetPartById(blip.Embed.Value);
                    using var stream = imagePart.GetStream();
                    using var ms = new MemoryStream();
                    stream.CopyTo(ms);
                    var originalBytes = ms.ToArray();

                    if (originalBytes.Length < 50 * 1024) continue; // Skip small images

                    // Find the display dimensions from the nearest Extent element
                    int displayWidthPx = 0, displayHeightPx = 0;

                    // Walk up to find the Drawing/Inline/Anchor element with Extent
                    var parent = blip.Parent;
                    while (parent != null)
                    {
                        var extent = parent.Descendants<DocumentFormat.OpenXml.Drawing.Wordprocessing.Extent>().FirstOrDefault();
                        if (extent != null && extent.Cx != null && extent.Cy != null)
                        {
                            displayWidthPx = (int)(extent.Cx.Value / emuPerPixel);
                            displayHeightPx = (int)(extent.Cy.Value / emuPerPixel);
                            break;
                        }
                        // Also check Drawing.Extents (inside ShapeProperties)
                        var drawingExtent = parent.Descendants<A.Extents>().FirstOrDefault();
                        if (drawingExtent != null && drawingExtent.Cx != null && drawingExtent.Cy != null)
                        {
                            displayWidthPx = (int)(drawingExtent.Cx.Value / emuPerPixel);
                            displayHeightPx = (int)(drawingExtent.Cy.Value / emuPerPixel);
                            break;
                        }
                        parent = parent.Parent;
                    }

                    var optimizedBytes = ImageOptimizer.OptimizeImage(originalBytes, displayWidthPx, displayHeightPx, _logger);

                    if (optimizedBytes.Length < originalBytes.Length)
                    {
                        // Replace the image data in the part
                        using var optimizedStream = new MemoryStream(optimizedBytes);
                        imagePart.FeedData(optimizedStream);

                        // Update content type if format changed (e.g., PNG -> JPEG)
                        var newType = DetectImagePartType(optimizedBytes);
                        if (newType.Contains("jpeg") && !imagePart.ContentType.Contains("jpeg"))
                        {
                            // Need to create a new image part with correct type and re-link
                            var newImagePart = AddImageToPart(part, newType);
                            using var newStream = new MemoryStream(optimizedBytes);
                            newImagePart.FeedData(newStream);
                            var newRelId = part.GetIdOfPart(newImagePart);
                            blip.Embed = newRelId;
                            part.DeletePart(imagePart);
                        }

                        totalSaved += originalBytes.Length - optimizedBytes.Length;
                        optimizedCount++;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "[OptimizeEmbeddedImages] Failed to optimize embedded image, skipping");
                }
            }
        }

        if (optimizedCount > 0)
        {
            _logger.LogInformation("[OptimizeEmbeddedImages] Optimized {Count} embedded images, saved {Saved}KB total",
                optimizedCount, totalSaved / 1024);
        }
    }

    private static (long width, long height) AdjustTextBoxAndGetDimensions(Run run)
    {
        var parentParagraph = run.Parent as Paragraph;
        OpenXmlElement? current = run.Parent;

        while (current != null)
        {
            if (current.LocalName == "txbxContent")
            {
                if (parentParagraph != null)
                {
                    var pPr = parentParagraph.GetFirstChild<ParagraphProperties>();
                    if (pPr == null) { pPr = new ParagraphProperties(); parentParagraph.PrependChild(pPr); }
                    if (pPr.SpacingBetweenLines == null) pPr.SpacingBetweenLines = new SpacingBetweenLines();
                    pPr.SpacingBetweenLines.After = "0";
                    pPr.SpacingBetweenLines.Before = "0";
                    if (pPr.Indentation == null) pPr.Indentation = new Indentation();
                    pPr.Indentation.Left = "0";
                    pPr.Indentation.Right = "0";
                    pPr.Indentation.FirstLine = "0";
                    pPr.Indentation.Hanging = "0";
                }

                var parent = current.Parent;
                while (parent != null)
                {
                    if (parent is WPS.WordprocessingShape shape)
                    {
                        var bodyPr = shape.GetFirstChild<WPS.TextBodyProperties>();
                        if (bodyPr == null) { bodyPr = new WPS.TextBodyProperties(); shape.AppendChild(bodyPr); }
                        bodyPr.LeftInset = 0; bodyPr.TopInset = 0; bodyPr.RightInset = 0; bodyPr.BottomInset = 0;

                        var spPr = shape.GetFirstChild<WPS.ShapeProperties>();
                        if (spPr != null)
                        {
                            var xfrm = spPr.GetFirstChild<A.Transform2D>();
                            if (xfrm?.Extents != null) return (xfrm.Extents.Cx ?? 0, xfrm.Extents.Cy ?? 0);
                        }
                    }
                    if (parent is DocumentFormat.OpenXml.Drawing.Wordprocessing.Inline inline && inline.Extent != null) return (inline.Extent.Cx ?? 0, inline.Extent.Cy ?? 0);
                    if (parent is DocumentFormat.OpenXml.Drawing.Wordprocessing.Anchor anchor && anchor.Extent != null) return (anchor.Extent.Cx ?? 0, anchor.Extent.Cy ?? 0);
                    if ((parent.LocalName == "shape" || parent.LocalName == "rect") && parent.GetAttributes().Any(a => a.LocalName == "style"))
                    {
                        var style = parent.GetAttributes().First(a => a.LocalName == "style").Value;
                        if (style != null) return ParseVmlStyleDimensions(style);
                    }
                    parent = parent.Parent;
                }
            }
            current = current.Parent;
        }

        // Fallback: Check if inside a Table Cell with fixed dimensions
        var cell = run.Ancestors<TableCell>().FirstOrDefault();
        if (cell != null)
        {
            long cellW = 0, cellH = 0;
            // Width
            var tcW = cell.TableCellProperties?.TableCellWidth;
            if (tcW != null && tcW.Type != null && tcW.Type == TableWidthUnitValues.Dxa && !string.IsNullOrEmpty(tcW.Width))
            {
                if (long.TryParse(tcW.Width, out var wTwips)) cellW = wTwips * 635; // 1 Twip = 635 EMUs
            }

            // Height (from Row)
            var row = cell.Parent as TableRow;
            var trH = row?.TableRowProperties?.GetFirstChild<TableRowHeight>();
            if (trH != null && trH.Val != null)
            {
                cellH = trH.Val.Value * 635;
            }

            if (cellW > 0 && cellH > 0) return (cellW, cellH);
        }

        return (0, 0);
    }

    private static (long width, long height) ParseVmlStyleDimensions(string style)
    {
        long width = 0; long height = 0;
        var parts = style.Split(';');
        foreach (var part in parts)
        {
            var keyValue = part.Split(':');
            if (keyValue.Length != 2) continue;
            var key = keyValue[0].Trim().ToLowerInvariant();
            var value = keyValue[1].Trim().ToLowerInvariant();
            if (key == "width") width = ParseVmlLength(value);
            else if (key == "height") height = ParseVmlLength(value);
        }
        return (width, height);
    }

    private static long ParseVmlLength(string value)
    {
        const long emuPerPoint = 12700; const long emuPerInch = 914400; const long emuPerPixel = 9525; const long emuPerCm = 360000;
        value = value.Trim();
        if (value.EndsWith("pt") && double.TryParse(value.Replace("pt", ""), out var pts)) return (long)(pts * emuPerPoint);
        if (value.EndsWith("in") && double.TryParse(value.Replace("in", ""), out var inches)) return (long)(inches * emuPerInch);
        if (value.EndsWith("px") && double.TryParse(value.Replace("px", ""), out var pixels)) return (long)(pixels * emuPerPixel);
        if (value.EndsWith("cm") && double.TryParse(value.Replace("cm", ""), out var cm)) return (long)(cm * emuPerCm);
        if (value.EndsWith("mm") && double.TryParse(value.Replace("mm", ""), out var mm)) return (long)(mm * emuPerCm / 10);
        return 0;
    }

    private static string GetAllTextWithFormatting(OpenXmlElement body)
    {
        var textBuilder = new StringBuilder();
        foreach (var element in body.Elements())
        {
            if (element is Paragraph paragraph)
            {
                foreach (var run in paragraph.Elements<Run>())
                {
                    foreach (var text in run.Elements<Text>()) textBuilder.Append(text.Text);
                    if (run.Descendants<TabChar>().Any() || (run.RunProperties?.Descendants<TabChar>().Any() ?? false)) textBuilder.Append('\t');
                }
                textBuilder.Append('\n');
            }
            else if (element is Table table)
            {
                foreach (var row in table.Elements<TableRow>())
                foreach (var cell in row.Elements<TableCell>())
                foreach (var p in cell.Elements<Paragraph>())
                {
                    foreach (var run in p.Elements<Run>())
                    {
                        foreach (var text in run.Elements<Text>()) textBuilder.Append(text.Text);
                        if (run.Descendants<TabChar>().Any() || (run.RunProperties?.Descendants<TabChar>().Any() ?? false)) textBuilder.Append('\t');
                    }
                    textBuilder.Append('\n');
                }
            }
        }
        return textBuilder.ToString();
    }

    public Task<TemplateValidationResult> ValidateTemplateAsync(Stream templateStream)
    {
        var result = new TemplateValidationResult { IsValid = true };
        try
        {
            templateStream.Position = 0;

            // Security scan: reject VBA macros, OLE objects, suspicious external relationships
            var scanResult = DocxSecurityScanner.Scan(templateStream);
            if (!scanResult.IsSafe)
            {
                result.IsValid = false;
                result.Errors.AddRange(scanResult.Threats);
                return Task.FromResult(result);
            }

            using var document = WordprocessingDocument.Open(templateStream, false);
            if (document.MainDocumentPart == null)
            {
                result.IsValid = false;
                result.Errors.Add("Document does not contain a main document part");
            }
        }
        catch (Exception ex)
        {
            result.IsValid = false;
            result.Errors.Add($"Failed to parse document: {ex.Message}");
        }
        finally
        {
            if (templateStream.CanSeek) templateStream.Position = 0;
        }
        return Task.FromResult(result);
    }

    public async Task<List<TemplateMarker>> ExtractMarkersAsync(Stream templateStream)
    {
        var markers = new List<TemplateMarker>();

        if (templateStream.CanSeek) templateStream.Position = 0;
        using var ms = new MemoryStream();
        await templateStream.CopyToAsync(ms);
        ms.Position = 0;

        using var document = WordprocessingDocument.Open(ms, false);
        var mainPart = document.MainDocumentPart;
        if (mainPart == null || mainPart.Document.Body == null) return markers;

        // 1. ดึงข้อมูลจากส่วนหัว (Headers)
        foreach (var headerPart in mainPart.HeaderParts)
        {
            if (headerPart.Header != null)
                ExtractMarkersFromElement(headerPart.Header, markers, 0);
        }

        // 2. ดึงข้อมูลจากส่วนเนื้อหา (Body)
        ExtractMarkersFromElement(mainPart.Document.Body, markers, 1);

        // 3. ดึงข้อมูลจากส่วนท้าย (Footers)
        foreach (var footerPart in mainPart.FooterParts)
        {
            if (footerPart.Footer != null)
                ExtractMarkersFromElement(footerPart.Footer, markers, 2);
        }

        var result = markers.GroupBy(m => new { m.Name, m.Type, m.TableIndex, m.IsTable })
                      .Select(g => g.First())
                      .OrderBy(m => m.SectionPriority)
                      .ToList();

        // บันทึก Log ลำดับของตัวแปรที่ดึงออกมาได้
        var markerOrder = string.Join(", ", result.Select(m => $"{m.Name} ({m.Type}, P:{m.SectionPriority})"));
        Console.WriteLine($"[DocxProcessingService] ลำดับ markers ที่ดึงได้: {markerOrder}");

        return result;
    }

    private void ExtractMarkersFromElement(OpenXmlElement element, List<TemplateMarker> markers, int sectionPriority)
    {
        // Create a list of tables to look up indices
        // We must filter tables exactly like ProcessTablesAsync does (ignoring layout tables)
        // so that the indices match the processed list.
        var tables = element.Descendants<Table>()
                            .Where(t => IsTableWithMarkers(t))
                            .ToList();

        // Iterate ALL paragraphs in document order
        foreach (var paragraph in element.Descendants<Paragraph>())
        {
            // Check if this paragraph is inside a table
            var parentTable = paragraph.Ancestors<Table>().FirstOrDefault();

            // If parentTable is a layout table (no markers), it won't be in our 'tables' list.
            // But wait, if the paragraph HAS markers (which we are checking below),
            // then parentTable MUST satisfy IsTableWithMarkers (because it contains this paragraph).
            // So parentTable SHOULD be in 'tables'.

            bool isTable = parentTable != null;
            int? tableIndex = null;

            if (isTable)
            {
                // Find index of this table in the filtered list
                int index = tables.IndexOf(parentTable!);
                if (index >= 0)
                {
                    tableIndex = index;
                }
                else
                {
                    // This happens if the table was filtered out (no markers).
                    // But if we found a marker in this paragraph, the table SHOULD have markers!
                    // Unless IsTableWithMarkers logic is different?
                    // IsTableWithMarkers checks immediate content.
                    // If this paragraph is nested deep?
                    // Paragraph.Ancestors<Table>().FirstOrDefault() gets the NEAREST table.
                    // IsTableWithMarkers iterates rows->cells->paragraphs.
                    // So it should match.

                    // However, if the marker is in a nested table inside a layout table?
                    // The layout table itself might not have markers in its immediate content.
                    // But the nested table does.
                    // parentTable will be the nested table.
                    // So the nested table should be in 'tables'.

                    // If index is -1, it means this table is not in our list of "Data Tables".
                    // Maybe we should treat it as not a table variable?
                    // Or maybe IsTableWithMarkers needs to be consistent.

                    isTable = index >= 0;
                }
            }

            // Let's reuse the run-based extraction from the original loop to be safe and accurate
            // Actually, the original Paragraph loop at line 1819 did:
            /*
            var text = new StringBuilder();
             foreach (var run in paragraph.Descendants<Run>())
                 foreach (var t in run.Descendants<Text>()) text.Append(t.Text);
            */

            var sb = new StringBuilder();
            foreach (var run in paragraph.Descendants<Run>())
            {
                foreach (var t in run.Descendants<Text>())
                {
                    sb.Append(t.Text);
                }
            }
            var paragraphText = sb.ToString();

            if (string.IsNullOrWhiteSpace(paragraphText) || !paragraphText.Contains("{{")) continue;

            var matches = Regex.Matches(paragraphText, @"\{\{([^}]+)\}\}");
            foreach (Match match in matches)
            {
                ParseMarkerContent(match.Groups[1].Value, match.Value, markers, sectionPriority, isTable, tableIndex);
            }
        }
    }

    private void ParseMarkerContent(string content, string rawText, List<TemplateMarker> markers, int sectionPriority, bool isTable = false, int? tableIndex = null)
    {
        content = content.Trim();

        // Handle closing tags {{/table:name}}, {{/if:name}} -> Ignore
        if (content.StartsWith("/")) return;

        // Handle opening tags {{#table:name}}, {{#if:name}}
        if (content.StartsWith("#"))
        {
            content = content.Substring(1).Trim();
        }

        // Ignore Table/Group Aggregation Markers
        // These are calculated fields, not variables to be supplied by the user.
        if (content.StartsWith("group:", StringComparison.OrdinalIgnoreCase) ||
            content.StartsWith("group_", StringComparison.OrdinalIgnoreCase) ||
            content.StartsWith("table_", StringComparison.OrdinalIgnoreCase) ||
            content.StartsWith("row_", StringComparison.OrdinalIgnoreCase) ||
            content.StartsWith("collapse:", StringComparison.OrdinalIgnoreCase) ||
            content.StartsWith("collapse_", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        string type = "variable";
        string name = content;
        bool isExplicitRow = false;

        if (content.Contains(":"))
        {
            var parts = content.Split(':', 2);
            var prefix = parts[0].Trim().ToLowerInvariant();
            name = parts[1].Trim();

            // Additional check for cases like "row_sum:price" which might pass the StartsWith check if whitespace or other chars exist
            // but here we check prefix after splitting by ':'

            // Check if prefix itself is one of the ignored keywords
            if (prefix.StartsWith("group_") ||
                prefix.StartsWith("table_") ||
                prefix.StartsWith("row_") ||
                prefix == "group" ||
                prefix == "collapse")
            {
                return;
            }

            switch (prefix)
            {
                case "row":
                    // Handle {{row:name}} -> treat as variable "name"
                    type = "variable";
                    name = parts[1];
                    isExplicitRow = true;
                    break;

                // Table: In new design, we don't have {{table:name}} anymore.
                // But if user still uses it, we map it to "variable" or ignore?
                // The user said "remove table:key from design".
                // So if we see it, it might be legacy.
                // However, we want to auto-detect variables inside tables.
                // The extraction logic iterates paragraphs. If a paragraph is inside a table, it's just text.
                // So we just extract "variable".

                case "table":
                    // Legacy: If found, maybe we still treat it as table marker?
                    // But the request says "remove requirement to specify table:key".
                    // Let's just treat it as variable or legacy table type if needed for backward compat?
                    // User says "update auto detect field to payload as modified".
                    // So we probably shouldn't return "table" type anymore if the new payload doesn't support named tables.
                    // The new payload uses List<List<...>>. No names.
                    // So detecting "table" type is useless for the payload structure hint.
                    // But maybe we return it as "variable" so it shows up?
                    // Actually, "table" markers should ideally be removed from docx design.
                    // If they exist, let's treat as 'variable' or ignore.
                    // Let's ignore special processing for 'table' prefix and treat as variable.
                    type = "variable";
                    name = content; // Keep full content "table:xyz" as name? Or just "xyz"?
                    // If the user hasn't updated the docx, they might still have {{table:product}}.
                    // If we treat it as variable, it will show up in "Replace" dictionary.
                    // If we treat it as "table" type, the UI might try to build a named table payload, which we don't support anymore.
                    // Let's default to variable.
                    break;

                case "image": type = "image"; break;
                case "qr":
                case "qrcode":
                    type = "qrcode";
                    break;
                case "barcode": type = "barcode"; break;

                // Condition removed
                case "if":
                    // Ignore condition markers completely as requested
                    return;

                case "col":
                    // Legacy column marker {{col:name}}.
                    // In new design, we use {{name}}.
                    // If we see {{col:name}}, we should probably treat it as variable "name"
                    // so the user knows they need to provide "name".
                    type = "variable";
                    name = parts[1];
                    break;

                default:
                    type = "variable";
                    name = content;
                    break;
            }
        }

        markers.Add(new TemplateMarker
        {
            Name = name,
            Type = type,
            RawText = rawText,
            IsTable = isTable && isExplicitRow, // Only consider as table variable if explicitly marked with row:
            TableIndex = tableIndex,
            SectionPriority = sectionPriority
        });
    }

    // private void ApplyFontToElement(OpenXmlElement element, string targetFont) { ... }
    // private void UpdateFonts(RunFonts fonts, string targetFont) { ... }

    private bool SyncRunProperties(OpenXmlElement element) => SyncRunProperties(element, null);

    private bool SyncRunProperties(OpenXmlElement element, Dictionary<string, string>? themeFontMap)
    {
        if (element == null) return false;
        dynamic rPr = element;
        bool changed = false;

        RunFonts? rFonts = rPr.RunFonts;
        if (rFonts != null && SyncFontSlots(rFonts, themeFontMap)) changed = true;

        FontSize? sz = rPr.FontSize;
        FontSizeComplexScript? szCs = rPr.FontSizeComplexScript;
        if (sz != null && sz.Val?.Value != null) { if (szCs == null) { rPr.FontSizeComplexScript = new FontSizeComplexScript { Val = sz.Val }; changed = true; } else if (szCs.Val?.Value == null) { szCs.Val = sz.Val; changed = true; } }
        else if (szCs != null && szCs.Val?.Value != null) { if (sz == null) { rPr.FontSize = new FontSize { Val = szCs.Val }; changed = true; } else if (sz.Val?.Value == null) { sz.Val = szCs.Val; changed = true; } }

        Bold? b = rPr.Bold;
        BoldComplexScript? bCs = rPr.BoldComplexScript;
        static bool IsOn(OnOffType? onOff) => onOff != null && (onOff.Val == null || onOff.Val.Value);
        if (IsOn(b) && !IsOn(bCs)) { if (bCs == null) { var newBCs = new BoldComplexScript(); if (b!.Val != null) newBCs.Val = b.Val; rPr.BoldComplexScript = newBCs; changed = true; } }
        else if (IsOn(bCs) && !IsOn(b)) { if (b == null) { var newB = new Bold(); if (bCs!.Val != null) newB.Val = bCs.Val; rPr.Bold = newB; changed = true; } }

        Italic? i = rPr.Italic;
        ItalicComplexScript? iCs = rPr.ItalicComplexScript;
        if (IsOn(i) && !IsOn(iCs)) { if (iCs == null) { var newICs = new ItalicComplexScript(); if (i!.Val != null) newICs.Val = i.Val; rPr.ItalicComplexScript = newICs; changed = true; } }
        else if (IsOn(iCs) && !IsOn(i)) { if (i == null) { var newI = new Italic(); if (iCs!.Val != null) newI.Val = iCs.Val; rPr.Italic = newI; changed = true; } }

        return changed;
    }

    /// <summary>
    /// Extracts the theme font scheme from the document's ThemePart.
    /// Maps theme slot names (e.g. "minorHAnsi", "majorBidi") to actual font names (e.g. "Google Sans").
    /// This is critical because Word stores fonts as theme references (w:asciiTheme="minorHAnsi")
    /// instead of explicit names — LibreOffice cannot resolve these themes correctly.
    /// </summary>
    private static Dictionary<string, string> ExtractThemeFontMap(MainDocumentPart mainPart)
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var themePart = mainPart.ThemePart;
        if (themePart?.Theme?.ThemeElements?.FontScheme == null) return map;

        var fontScheme = themePart.Theme.ThemeElements.FontScheme;

        // Major fonts (typically used for headings)
        var major = fontScheme.MajorFont;
        if (major != null)
        {
            if (!string.IsNullOrEmpty(major.LatinFont?.Typeface)) map["majorHAnsi"] = major.LatinFont!.Typeface!;
            if (!string.IsNullOrEmpty(major.ComplexScriptFont?.Typeface)) map["majorBidi"] = major.ComplexScriptFont!.Typeface!;
            if (!string.IsNullOrEmpty(major.EastAsianFont?.Typeface)) map["majorEastAsia"] = major.EastAsianFont!.Typeface!;
        }

        // Minor fonts (typically used for body text)
        var minor = fontScheme.MinorFont;
        if (minor != null)
        {
            if (!string.IsNullOrEmpty(minor.LatinFont?.Typeface)) map["minorHAnsi"] = minor.LatinFont!.Typeface!;
            if (!string.IsNullOrEmpty(minor.ComplexScriptFont?.Typeface)) map["minorBidi"] = minor.ComplexScriptFont!.Typeface!;
            if (!string.IsNullOrEmpty(minor.EastAsianFont?.Typeface)) map["minorEastAsia"] = minor.EastAsianFont!.Typeface!;
        }

        return map;
    }

    private bool SyncFontSlots(RunFonts rFonts) => SyncFontSlots(rFonts, null);

    private bool SyncFontSlots(RunFonts rFonts, Dictionary<string, string>? themeFontMap)
    {
        bool changed = false;
        string? ascii = rFonts.Ascii?.Value;
        string? highAnsi = rFonts.HighAnsi?.Value;
        string? complexScript = rFonts.ComplexScript?.Value;
        string? eastAsia = rFonts.EastAsia?.Value;

        // Skip if symbol
        if ((ascii != null && SymbolFonts.Contains(ascii)) || (highAnsi != null && SymbolFonts.Contains(highAnsi))) return false;

        // 0. Resolve theme font references to explicit font names.
        // Word often stores ONLY theme references (e.g. w:asciiTheme="minorHAnsi") without
        // explicit font names. LibreOffice cannot resolve these themes, so we must do it here.
        if (themeFontMap != null && themeFontMap.Count > 0)
        {
            if (string.IsNullOrEmpty(ascii) && rFonts.AsciiTheme?.Value != null)
            {
                var themeKey = rFonts.AsciiTheme.InnerText; // XML string e.g. "minorHAnsi", not C# enum name
                if (!string.IsNullOrEmpty(themeKey) && themeFontMap.TryGetValue(themeKey, out var resolved))
                {
                    rFonts.Ascii = resolved;
                    ascii = resolved;
                    changed = true;
                }
            }
            if (string.IsNullOrEmpty(highAnsi) && rFonts.HighAnsiTheme?.Value != null)
            {
                var themeKey = rFonts.HighAnsiTheme.InnerText;
                if (!string.IsNullOrEmpty(themeKey) && themeFontMap.TryGetValue(themeKey, out var resolved))
                {
                    rFonts.HighAnsi = resolved;
                    highAnsi = resolved;
                    changed = true;
                }
            }
            if (string.IsNullOrEmpty(complexScript) && rFonts.ComplexScriptTheme?.Value != null)
            {
                var themeKey = rFonts.ComplexScriptTheme.InnerText;
                if (!string.IsNullOrEmpty(themeKey) && themeFontMap.TryGetValue(themeKey, out var resolved))
                {
                    rFonts.ComplexScript = resolved;
                    complexScript = resolved;
                    changed = true;
                }
            }
            if (string.IsNullOrEmpty(eastAsia) && rFonts.EastAsiaTheme?.Value != null)
            {
                var themeKey = rFonts.EastAsiaTheme.InnerText;
                if (!string.IsNullOrEmpty(themeKey) && themeFontMap.TryGetValue(themeKey, out var resolved))
                {
                    rFonts.EastAsia = resolved;
                    eastAsia = resolved;
                    changed = true;
                }
            }
        }

        // 1. Sync Values: Ascii/HighAnsi -> ComplexScript (if CS is empty)
        // This ensures Thai text (which uses CS slot) will use the same font as English if CS isn't set.
        if (string.IsNullOrEmpty(complexScript))
        {
            if (!string.IsNullOrEmpty(ascii)) { rFonts.ComplexScript = ascii; changed = true; }
            else if (!string.IsNullOrEmpty(highAnsi)) { rFonts.ComplexScript = highAnsi; changed = true; }
        }

        // 2. Clear ALL theme font attributes now that explicit names are resolved.
        // LibreOffice prioritizes theme font references over explicit font names.
        // By clearing theme attributes, we force LibreOffice to use the explicit font names.
        if (!string.IsNullOrEmpty(ascii) || !string.IsNullOrEmpty(highAnsi))
        {
            if (rFonts.AsciiTheme != null) { rFonts.AsciiTheme = null; changed = true; }
            if (rFonts.HighAnsiTheme != null) { rFonts.HighAnsiTheme = null; changed = true; }
            if (rFonts.EastAsiaTheme != null) { rFonts.EastAsiaTheme = null; changed = true; }
            if (rFonts.ComplexScriptTheme != null) { rFonts.ComplexScriptTheme = null; changed = true; }
        }

        // NOTE: We deliberately DO NOT sync back (ComplexScript -> Ascii)
        // because that causes English text (Ascii) to be overwritten by Thai fonts (CS)
        // which might be inherited defaults (e.g. Cordia New/Kanit) instead of the designed font.

        return changed;
    }

    private static bool ShouldConvertUnderlineValue(UnderlineValues value)
    {
        return value == UnderlineValues.Dash || value == UnderlineValues.DashLong || value == UnderlineValues.DashedHeavy || value == UnderlineValues.DashLongHeavy ||
               value == UnderlineValues.Dotted || value == UnderlineValues.DottedHeavy || value == UnderlineValues.DotDash || value == UnderlineValues.DashDotHeavy ||
               value == UnderlineValues.DotDotDash || value == UnderlineValues.DashDotDotHeavy;
    }
}
