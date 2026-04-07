using Microsoft.Extensions.Logging;
using QRCoder;
using QorstackReportService.Application.Common.Interfaces;
using SkiaSharp;

namespace QorstackReportService.Infrastructure.Services.QrCode;

/// <summary>
/// QR code generation service implementation using QRCoder and SkiaSharp
/// </summary>
public class QrCodeService : IQrCodeService
{
    private readonly ILogger<QrCodeService> _logger;

    public QrCodeService(ILogger<QrCodeService> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public byte[] GenerateQrCode(string text, int size = 200)
    {
        return GenerateQrCode(text, new QrCodeOptions { Size = size });
    }

    /// <inheritdoc />
    public byte[] GenerateQrCode(string text, QrCodeOptions options)
    {
        try
        {
            _logger.LogDebug("Generating QR code for text of length {Length}", text.Length);

            using var qrGenerator = new QRCodeGenerator();

            // Map error correction level
            var eccLevel = options.ErrorCorrectionLevel?.ToUpperInvariant() switch
            {
                "L" => QRCodeGenerator.ECCLevel.L,
                "M" => QRCodeGenerator.ECCLevel.M,
                "Q" => QRCodeGenerator.ECCLevel.Q,
                "H" => QRCodeGenerator.ECCLevel.H,
                _ => QRCodeGenerator.ECCLevel.M
            };

            var qrCodeData = qrGenerator.CreateQrCode(text, eccLevel);
            return RenderQrCode(qrCodeData, options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate QR code");
            throw;
        }
    }

    private byte[] RenderQrCode(QRCodeData data, QrCodeOptions options)
    {
        var modules = data.ModuleMatrix;
        var modulesCount = modules.Count;

        // Determine visible region
        int startX = 0;
        int startY = 0;
        int visibleCount = modulesCount;

        if (!options.DrawQuietZones)
        {
            // Scan for data bounds
            int minX = modulesCount;
            int maxX = -1;
            int minY = modulesCount;
            int maxY = -1;

            for (int y = 0; y < modulesCount; y++)
            {
                var row = modules[y];
                for (int x = 0; x < modulesCount; x++)
                {
                    if (row[x])
                    {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (maxX >= minX && maxY >= minY)
            {
                // Found data
                var width = maxX - minX + 1;
                var height = maxY - minY + 1;

                // Use the larger dimension and center the other if needed (though QR are usually square data)
                visibleCount = Math.Max(width, height);
                startX = minX;
                startY = minY;
            }
        }

        var pixelsPerModule = Math.Max(1, options.Size / visibleCount);
        var realSize = pixelsPerModule * visibleCount;
        var offset = (options.Size - realSize) / 2;

        var mainColor = SKColor.Parse(options.Color ?? "#000000");
        var bgColor = SKColor.Parse(options.BackgroundColor ?? "#FFFFFF");

        using var surface = SKSurface.Create(new SKImageInfo(options.Size, options.Size));
        var canvas = surface.Canvas;

        // Draw background
        canvas.Clear(bgColor);

        using var paint = new SKPaint
        {
            Color = mainColor,
            IsAntialias = false, // Keep sharp edges for QR code
            Style = SKPaintStyle.Fill
        };

        for (int x = 0; x < visibleCount; x++)
        {
            for (int y = 0; y < visibleCount; y++)
            {
                var moduleX = startX + x;
                var moduleY = startY + y;

                if (moduleX < modulesCount && moduleY < modulesCount && modules[moduleY][moduleX])
                {
                    var rect = new SKRect(
                        offset + x * pixelsPerModule,
                        offset + y * pixelsPerModule,
                        offset + (x + 1) * pixelsPerModule,
                        offset + (y + 1) * pixelsPerModule
                    );

                    canvas.DrawRect(rect, paint);
                }
            }
        }

        // Draw Logo
        if (options.LogoData != null && options.LogoData.Length > 0)
        {
            try
            {
                using var logoStream = new MemoryStream(options.LogoData);
                using var logoBitmap = SKBitmap.Decode(logoStream);
                if (logoBitmap != null)
                {
                    // Calculate logo size (e.g., 20% of QR code size)
                    var logoSize = options.Size * 0.2f;
                    var logoX = (options.Size - logoSize) / 2;
                    var logoY = (options.Size - logoSize) / 2;

                    var logoRect = new SKRect(logoX, logoY, logoX + logoSize, logoY + logoSize);

                    // Draw white background for logo
                    using var bgPaint = new SKPaint { Color = bgColor, Style = SKPaintStyle.Fill };
                    canvas.DrawRect(logoRect, bgPaint);

                    canvas.DrawBitmap(logoBitmap, logoRect);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to render logo on QR code");
            }
        }

        using var image = surface.Snapshot();
        using var dataStream = image.Encode(SKEncodedImageFormat.Png, 100);
        return dataStream.ToArray();
    }

}
