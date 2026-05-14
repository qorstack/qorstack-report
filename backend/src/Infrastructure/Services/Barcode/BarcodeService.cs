using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;
using SkiaSharp;
using ZXing;
using ZXing.SkiaSharp;
using ZXing.Common;

namespace QorstackReportService.Infrastructure.Services.Barcode;

public class BarcodeService : IBarcodeService
{
    private readonly ILogger<BarcodeService> _logger;

    public BarcodeService(ILogger<BarcodeService> logger)
    {
        _logger = logger;
    }

    public byte[] GenerateBarcode(string text, BarcodeOptions options)
    {
        try
        {
            // Scale 6x for ultra-sharp rendering
            const int Scale = 6;
            var barcodeWidth = options.Width * Scale;
            var barcodeHeight = options.Height * Scale; // height applies to barcode only
            var margin = options.DrawQuietZones ? (10 * Scale) : 0;

            var format = ParseFormat(options.Format);

            if (!SKColor.TryParse(options.Color ?? "#000000", out var fgColor)) fgColor = SKColors.Black;
            if (!SKColor.TryParse(options.BackgroundColor ?? "#FFFFFF", out var bgColor)) bgColor = SKColors.White;

            // Step 1: Measure text first — width/height only affect the barcode area.
            // Text height is computed from natural font metrics so text is never squished.
            int textAreaHeight = 0;
            float finalFontSize = 0;

            if (options.IncludeText)
            {
                using var typeface = SKTypeface.FromFamilyName("Arial", SKFontStyle.Normal);
                float maxTextWidth = Math.Max(barcodeWidth - (2 * margin), 1);

                // Natural font size proportional to barcode width (independent of height).
                // Divisor controls relative text size — larger = smaller text.
                float naturalSize = barcodeWidth / 18.0f;

                // Scale down only if text overflows the available width
                using var tempFont = new SKFont(typeface, naturalSize);
                float measuredWidth = tempFont.MeasureText(text);
                if (measuredWidth > maxTextWidth && measuredWidth > 0)
                    naturalSize = naturalSize * maxTextWidth / measuredWidth;

                finalFontSize = naturalSize;

                using var metricsFont = new SKFont(typeface, finalFontSize);
                metricsFont.GetFontMetrics(out var m);
                // ascent is negative; add 40% padding so text isn't cramped
                textAreaHeight = (int)((-m.Ascent + m.Descent) * 1.4f);
            }

            // Total canvas = barcode area (user-controlled) + text area (font-driven)
            int totalWidth = barcodeWidth;
            int totalHeight = barcodeHeight + textAreaHeight;

            // Step 2: Encode barcode at the barcode-only dimensions
            var writer = new BarcodeWriter
            {
                Format = format,
                Options = new EncodingOptions
                {
                    Width = barcodeWidth,
                    Height = barcodeHeight,
                    Margin = options.DrawQuietZones ? 1 : 0,
                    PureBarcode = true
                }
            };

            using var barcodeBitmap = writer.Write(text);

            // Step 3: Compose final image
            using var surface = SKSurface.Create(new SKImageInfo(totalWidth, totalHeight));
            var canvas = surface.Canvas;
            canvas.Clear(bgColor);

            float drawX = margin;
            float drawY = margin;
            float drawW = barcodeWidth - (2 * margin);
            float drawH = barcodeHeight - (2 * margin);
            if (drawW <= 0) drawW = barcodeWidth;
            if (drawH <= 0) drawH = barcodeHeight;

            var destRect = new SKRect(drawX, drawY, drawX + drawW, drawY + drawH);

#pragma warning disable CS0618
            using var paint = new SKPaint { FilterQuality = SKFilterQuality.High };
            canvas.DrawBitmap(barcodeBitmap, destRect, paint);
#pragma warning restore CS0618

            // Step 4: Draw text label below the barcode — natural size, never squished
            if (options.IncludeText && finalFontSize > 0)
            {
                using var textPaint = new SKPaint { Color = fgColor, IsAntialias = true };
                using var typeface = SKTypeface.FromFamilyName("Arial", SKFontStyle.Normal);
                using var font = new SKFont(typeface, finalFontSize) { Edging = SKFontEdging.SubpixelAntialias };

                font.GetFontMetrics(out var metrics);
                float textWidth = font.MeasureText(text);
                float x = (totalWidth - textWidth) / 2.0f;

                // Vertically center the text within the text area (below barcodeHeight)
                float textAreaMidY = barcodeHeight + textAreaHeight / 2.0f;
                float textY = textAreaMidY - (metrics.Ascent + metrics.Descent) / 2.0f;

                canvas.DrawText(text, x, textY, font, textPaint);
            }

            using var image = surface.Snapshot();
            using var data = image.Encode(SKEncodedImageFormat.Png, 100);
            return data.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate barcode for '{Text}' with format '{Format}'", text, options.Format);
            throw;
        }
    }

    private BarcodeFormat ParseFormat(string format)
    {
        // normalize text
        var normalized = format.Replace("_", "").Replace("-", "");

        if (Enum.TryParse<BarcodeFormat>(normalized, true, out var result))
        {
            return result;
        }

        // Manual mapping for common variations
        if (normalized.Equals("CODE128", StringComparison.OrdinalIgnoreCase)) return BarcodeFormat.CODE_128;
        if (normalized.Equals("CODE39", StringComparison.OrdinalIgnoreCase)) return BarcodeFormat.CODE_39;
        if (normalized.Equals("EAN13", StringComparison.OrdinalIgnoreCase)) return BarcodeFormat.EAN_13;

        return BarcodeFormat.CODE_128;
    }
}
