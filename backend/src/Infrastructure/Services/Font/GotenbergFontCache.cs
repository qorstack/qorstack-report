using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Infrastructure.Services.Pdf;

namespace QorstackReportService.Infrastructure.Services.Font;

/// <summary>
/// Writes font files to a local directory that is shared with the Gotenberg container
/// via a Docker volume mount. Gotenberg mounts this path at /usr/share/fonts/custom,
/// allowing LibreOffice to pick up fonts on each conversion request.
/// </summary>
public class GotenbergFontCache : IGotenbergFontCache
{
    private readonly string? _fontsPath;
    private readonly ILogger<GotenbergFontCache> _logger;

    public GotenbergFontCache(IOptions<GotenbergSettings> settings, ILogger<GotenbergFontCache> logger)
    {
        _fontsPath = settings.Value.FontsPath;
        _logger = logger;

        if (_fontsPath != null)
        {
            Directory.CreateDirectory(_fontsPath);
            _logger.LogInformation("[GotenbergFontCache] Fonts path: {Path}", _fontsPath);
        }
    }

    public bool IsEnabled => _fontsPath != null;

    public async Task WriteAsync(string fileName, byte[] bytes, CancellationToken ct = default)
    {
        if (_fontsPath == null) return;

        var dest = Path.Combine(_fontsPath, fileName);
        await File.WriteAllBytesAsync(dest, bytes, ct);
        _logger.LogDebug("[GotenbergFontCache] Written {FileName} ({Bytes} bytes)", fileName, bytes.Length);
    }

    public Task DeleteAsync(string fileName, CancellationToken ct = default)
    {
        if (_fontsPath == null) return Task.CompletedTask;

        var dest = Path.Combine(_fontsPath, fileName);
        if (File.Exists(dest))
        {
            File.Delete(dest);
            _logger.LogDebug("[GotenbergFontCache] Deleted {FileName}", fileName);
        }

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<string>> ListFilesAsync()
    {
        if (_fontsPath == null)
            return Task.FromResult<IReadOnlyList<string>>([]);

        var files = Directory.GetFiles(_fontsPath) // root level only — subdirs (e.g. system/) are managed by font-syncer
            .Select(Path.GetFileName)
            .Where(name => name != null)
            .Cast<string>()
            .ToList();

        return Task.FromResult<IReadOnlyList<string>>(files);
    }
}
