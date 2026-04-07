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
            // Increase resolution (Scale 6x) for ultra-sharp text/rendering
            // This ensures text remains crisp even after downscaling by document viewers
            const int Scale = 6;
            var width = options.Width * Scale;
            var height = options.Height * Scale;
            var margin = options.DrawQuietZones ? (10 * Scale) : 0;

            var format = ParseFormat(options.Format);

            // Parse colors
            if (!SKColor.TryParse(options.Color ?? "#000000", out var fgColor)) fgColor = SKColors.Black;
            if (!SKColor.TryParse(options.BackgroundColor ?? "#FFFFFF", out var bgColor)) bgColor = SKColors.White;

            // Determine layout
            int textHeight = 0;
            if (options.IncludeText)
            {
                // Allocate roughly 30% for text (increased from 20% for larger font)
                textHeight = (int)(height * 0.25);
            }
            int barcodeHeight = height - textHeight;

            var writer = new BarcodeWriter
            {
                Format = format,
                Options = new EncodingOptions
                {
                    Width = width,
                    Height = barcodeHeight,
                    Margin = options.DrawQuietZones ? 1 : 0, // Minimal margin in ZXing
                    PureBarcode = true // We draw text manually
                }
            };

            using var barcodeBitmap = writer.Write(text);

            // Create final surface
            using var surface = SKSurface.Create(new SKImageInfo(width, height));
            var canvas = surface.Canvas;
            canvas.Clear(bgColor);

            // Destination rect with margin
            float drawX = margin;
            float drawY = margin;
            float drawW = width - (2 * margin);
            float drawH = barcodeHeight - (2 * margin);

            if (drawW <= 0) drawW = width;
            if (drawH <= 0) drawH = barcodeHeight;

            var destRect = new SKRect(drawX, drawY, drawX + drawW, drawY + drawH);

#pragma warning disable CS0618 // Type or member is obsolete
            using var paint = new SKPaint { FilterQuality = SKFilterQuality.High };
            canvas.DrawBitmap(barcodeBitmap, destRect, paint);
#pragma warning restore CS0618

            // Draw Text
            if (options.IncludeText)
            {
                using var textPaint = new SKPaint
                {
                    Color = fgColor,
                    IsAntialias = true
                    // TextAlign and SubpixelText are obsolete/not needed with SKFont
                };

                // Use SKFont for text properties
                // SKPaint.Typeface and SKPaint.TextSize are obsolete, use SKFont instead
                using var typeface = SKTypeface.FromFamilyName("Arial", SKFontStyle.Normal); 
                
                // Calculate font size with constraints:
                // 1. Height constraint: fit within text area (textHeight * 0.9)
                // 2. Width constraint (Lock): proportional to total width (width / 16) to prevent huge font for short text
                float fontSizeBasedOnHeight = textHeight * 0.9f;
                float fontSizeBasedOnWidth = width / 16.0f;
                float targetFontSize = Math.Min(fontSizeBasedOnHeight, fontSizeBasedOnWidth);

                using var font = new SKFont(typeface, targetFontSize)
                {
                    Edging = SKFontEdging.SubpixelAntialias
                };

                // Measure
                float textWidth = font.MeasureText(text);
                float maxWidth = width - (2 * margin);

                if (textWidth > maxWidth)
                {
                    float scaleFactor = maxWidth / textWidth;
                    font.Size *= scaleFactor;
                    textWidth = font.MeasureText(text); // Recalculate width after scaling
                }

                // Center coordinates
                // Manually calculate X for centering since SKFont doesn't use TextAlign
                float x = (width - textWidth) / 2.0f;

                // Vertical center of text area
                float textCenterY = barcodeHeight + (textHeight / 2.0f);

                // Re-calculate Y based on font metrics
                font.GetFontMetrics(out var metrics);
                // Center vertically in text area:
                // textCenterY is middle of text box.
                // Text is drawn at baseline.
                // Cap height ~ abs(metrics.Ascent).
                // To center: Y = Center + (CapHeight / 2) - Descent? No, roughly -Ascent/2 - Descent/2
                // Note: Ascent is negative
                float textY = textCenterY - (metrics.Ascent + metrics.Descent) / 2;

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
