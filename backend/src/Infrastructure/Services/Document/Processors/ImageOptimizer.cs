using Microsoft.Extensions.Logging;
using SkiaSharp;

namespace QorstackReportService.Infrastructure.Services.Document.Processors;

/// <summary>
/// Optimizes images for Word document embedding to reduce file size and speed up PDF conversion.
/// Uses SkiaSharp for high-quality resizing and re-encoding.
/// </summary>
public static class ImageOptimizer
{
    /// <summary>
    /// Maximum pixel dimension for images when no display size is known.
    /// Images larger than this will be downscaled.
    /// </summary>
    private const int DefaultMaxPixelDimension = 1920;

    /// <summary>
    /// JPEG encoding quality (1-100). 92 is visually lossless for most content.
    /// </summary>
    private const int JpegQuality = 92;

    /// <summary>
    /// Minimum file size in bytes before optimization is attempted (50KB).
    /// Images smaller than this are unlikely to benefit from optimization.
    /// </summary>
    private const int MinSizeForOptimization = 50 * 1024;

    /// <summary>
    /// DPI multiplier for print quality. Display pixels * this factor = max pixels to keep.
    /// 300 DPI / 96 DPI ≈ 3.125, but we use 2.0 for a good balance of quality and size.
    /// At 2x, a 200px display image becomes 400px max - still excellent print quality.
    /// </summary>
    private const double PrintDpiMultiplier = 2.0;

    /// <summary>
    /// Optimizes image bytes for embedding in a Word document.
    /// Resizes if the image is larger than needed for the target display dimensions.
    /// Re-encodes to reduce file size while maintaining visual quality.
    /// </summary>
    /// <param name="imageBytes">Original image bytes</param>
    /// <param name="targetDisplayWidthPx">Target display width in pixels (0 = unknown)</param>
    /// <param name="targetDisplayHeightPx">Target display height in pixels (0 = unknown)</param>
    /// <param name="logger">Optional logger for diagnostics</param>
    /// <returns>Optimized image bytes (may be the original if no optimization was beneficial)</returns>
    public static byte[] OptimizeImage(byte[] imageBytes, int targetDisplayWidthPx = 0, int targetDisplayHeightPx = 0, ILogger? logger = null)
    {
        if (imageBytes == null || imageBytes.Length < MinSizeForOptimization)
            return imageBytes ?? Array.Empty<byte>();

        try
        {
            using var originalBitmap = SKBitmap.Decode(imageBytes);
            if (originalBitmap == null)
                return imageBytes;

            int originalWidth = originalBitmap.Width;
            int originalHeight = originalBitmap.Height;

            // Determine max allowed dimensions
            int maxWidth, maxHeight;
            if (targetDisplayWidthPx > 0 && targetDisplayHeightPx > 0)
            {
                // Scale up by print DPI multiplier for high-quality print output
                maxWidth = (int)(targetDisplayWidthPx * PrintDpiMultiplier);
                maxHeight = (int)(targetDisplayHeightPx * PrintDpiMultiplier);
            }
            else if (targetDisplayWidthPx > 0)
            {
                maxWidth = (int)(targetDisplayWidthPx * PrintDpiMultiplier);
                maxHeight = int.MaxValue;
            }
            else if (targetDisplayHeightPx > 0)
            {
                maxWidth = int.MaxValue;
                maxHeight = (int)(targetDisplayHeightPx * PrintDpiMultiplier);
            }
            else
            {
                maxWidth = DefaultMaxPixelDimension;
                maxHeight = DefaultMaxPixelDimension;
            }

            // Ensure minimum dimensions to avoid tiny images
            maxWidth = Math.Max(maxWidth, 100);
            maxHeight = Math.Max(maxHeight, 100);

            bool needsResize = originalWidth > maxWidth || originalHeight > maxHeight;
            bool hasAlpha = HasTransparency(originalBitmap);
            bool isCurrentlyJpeg = IsJpeg(imageBytes);

            // If no resize needed and already JPEG (or small PNG with alpha), skip
            if (!needsResize && isCurrentlyJpeg)
                return imageBytes;

            // Calculate new dimensions maintaining aspect ratio
            int newWidth = originalWidth;
            int newHeight = originalHeight;
            if (needsResize)
            {
                double scaleX = (double)maxWidth / originalWidth;
                double scaleY = (double)maxHeight / originalHeight;
                double scale = Math.Min(scaleX, scaleY);
                newWidth = Math.Max(1, (int)(originalWidth * scale));
                newHeight = Math.Max(1, (int)(originalHeight * scale));
            }

            // Resize if needed
            SKBitmap targetBitmap;
            if (needsResize)
            {
                targetBitmap = originalBitmap.Resize(new SKImageInfo(newWidth, newHeight, originalBitmap.ColorType, originalBitmap.AlphaType), new SKSamplingOptions(SKCubicResampler.Mitchell));
                if (targetBitmap == null)
                    return imageBytes;
            }
            else
            {
                targetBitmap = originalBitmap;
            }

            try
            {
                byte[] optimizedBytes;

                if (hasAlpha)
                {
                    // Keep as PNG but re-encode (SkiaSharp produces well-compressed PNGs)
                    using var image = SKImage.FromBitmap(targetBitmap);
                    using var encoded = image.Encode(SKEncodedImageFormat.Png, 100);
                    optimizedBytes = encoded.ToArray();
                }
                else
                {
                    // Encode as JPEG for best compression (no transparency to preserve)
                    using var image = SKImage.FromBitmap(targetBitmap);
                    using var encoded = image.Encode(SKEncodedImageFormat.Jpeg, JpegQuality);
                    optimizedBytes = encoded.ToArray();
                }

                // Only use optimized version if it's actually smaller
                if (optimizedBytes.Length < imageBytes.Length)
                {
                    var savedPercent = (1.0 - (double)optimizedBytes.Length / imageBytes.Length) * 100;
                    logger?.LogInformation(
                        "[ImageOptimizer] Optimized: {OrigW}x{OrigH} -> {NewW}x{NewH}, {OrigSize}KB -> {NewSize}KB ({Saved:F1}% saved, alpha={HasAlpha})",
                        originalWidth, originalHeight, newWidth, newHeight,
                        imageBytes.Length / 1024, optimizedBytes.Length / 1024, savedPercent, hasAlpha);
                    return optimizedBytes;
                }

                logger?.LogDebug("[ImageOptimizer] Skipped (optimized not smaller): {W}x{H}, {Size}KB", originalWidth, originalHeight, imageBytes.Length / 1024);
                return imageBytes;
            }
            finally
            {
                if (needsResize && targetBitmap != originalBitmap)
                    targetBitmap.Dispose();
            }
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "[ImageOptimizer] Failed to optimize image ({Size}KB), using original", imageBytes.Length / 1024);
            return imageBytes;
        }
    }

    /// <summary>
    /// Checks if a bitmap has any transparent pixels.
    /// Only samples a subset of pixels for performance on large images.
    /// </summary>
    private static bool HasTransparency(SKBitmap bitmap)
    {
        if (bitmap.AlphaType == SKAlphaType.Opaque)
            return false;

        // Sample pixels to check for transparency (checking every pixel is too slow for large images)
        int step = Math.Max(1, Math.Min(bitmap.Width, bitmap.Height) / 50);
        for (int y = 0; y < bitmap.Height; y += step)
        {
            for (int x = 0; x < bitmap.Width; x += step)
            {
                var pixel = bitmap.GetPixel(x, y);
                if (pixel.Alpha < 255)
                    return true;
            }
        }
        return false;
    }

    /// <summary>
    /// Checks if image bytes represent a JPEG by magic bytes.
    /// </summary>
    private static bool IsJpeg(byte[] bytes)
    {
        return bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF;
    }

    /// <summary>
    /// Checks if image bytes represent a PNG by magic bytes.
    /// </summary>
    private static bool IsPng(byte[] bytes)
    {
        return bytes.Length >= 4 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
    }
}
