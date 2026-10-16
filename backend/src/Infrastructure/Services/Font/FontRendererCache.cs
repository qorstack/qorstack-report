using Microsoft.Extensions.Configuration;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services.Font;

/// <summary>
/// Checks the renderer's font directory. Uses <c>Fonts:RendererCachePath</c> (the font-syncer volume mounted
/// read-only into the API, layout <c>{path}/{storage key}</c>); falls back to <c>Gotenberg:FontsPath</c>
/// (the API writes fonts there itself, flat by file name). Neither set → not configured.
/// </summary>
public sealed class FontRendererCache : IFontRendererCache
{
    private readonly string? _syncedPath;
    private readonly string? _flatPath;

    public FontRendererCache(IConfiguration configuration)
    {
        _syncedPath = NullIfEmpty(configuration["Fonts:RendererCachePath"]);
        _flatPath = NullIfEmpty(configuration["Gotenberg:FontsPath"]);
    }

    public bool IsConfigured => _syncedPath != null || _flatPath != null;

    public bool Contains(string storageKey)
    {
        if (string.IsNullOrWhiteSpace(storageKey) || storageKey.Contains("..", StringComparison.Ordinal)) return false;
        if (_syncedPath != null && File.Exists(Path.Combine(_syncedPath, storageKey.Replace('/', Path.DirectorySeparatorChar))))
            return true;
        return _flatPath != null && File.Exists(Path.Combine(_flatPath, Path.GetFileName(storageKey)));
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;
}
