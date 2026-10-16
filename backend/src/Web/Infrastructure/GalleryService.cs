using System.Text.Json;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Web.Infrastructure;

/// <summary>
/// Bundled gallery source: reads a `gallery.json` manifest and template files from
/// a folder shipped with the app. The folder is configurable via `Gallery:Path`
/// (default: &lt;ContentRoot&gt;/gallery), so the same code can later point at a
/// mounted volume or a synced remote copy without changing the contract.
/// </summary>
public sealed class GalleryService : IGalleryService
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private readonly string _root;
    private readonly ILogger<GalleryService> _logger;
    private readonly List<ManifestEntry> _entries;

    public GalleryService(IWebHostEnvironment env, IConfiguration config, ILogger<GalleryService> logger)
    {
        _logger = logger;

        // Resolve the gallery folder. Explicit config wins; otherwise look for a
        // `gallery/gallery.json` at (or above) the content root and the app base dir.
        // Docker finds it immediately at /app/gallery; local `dotnet run` finds it by
        // walking up to the repo root.
        var configured = config["Gallery:Path"];
        _root = (!string.IsNullOrWhiteSpace(configured) ? configured : null)
            ?? FindGalleryRoot(env.ContentRootPath)
            ?? FindGalleryRoot(AppContext.BaseDirectory)
            ?? Path.Combine(env.ContentRootPath, "gallery");
        _entries = LoadManifest();
    }

    public IReadOnlyList<GalleryTemplateInfo> List() =>
        _entries.Select(e => new GalleryTemplateInfo(
            e.Id, e.Name, e.Description, e.Category, e.FileType, ThumbnailPath(e) is not null)).ToList();

    public string? GetThumbnailPath(string id)
    {
        var entry = _entries.FirstOrDefault(x => string.Equals(x.Id, id, StringComparison.OrdinalIgnoreCase));
        return entry is null ? null : ThumbnailPath(entry);
    }

    /// <summary>The entry's thumbnail inside the gallery folder, if the file exists.</summary>
    private string? ThumbnailPath(ManifestEntry entry)
    {
        if (string.IsNullOrWhiteSpace(entry.Thumbnail)) return null;
        var path = Path.GetFullPath(Path.Combine(_root, entry.Thumbnail.Replace('/', Path.DirectorySeparatorChar)));
        var root = Path.GetFullPath(_root) + Path.DirectorySeparatorChar;
        return path.StartsWith(root, StringComparison.OrdinalIgnoreCase) && File.Exists(path) ? path : null;
    }

    public GalleryTemplateAsset? Get(string id)
    {
        var entry = _entries.FirstOrDefault(x => string.Equals(x.Id, id, StringComparison.OrdinalIgnoreCase));
        if (entry is null) return null;

        var filePath = Path.Combine(_root, entry.File.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(filePath))
        {
            _logger.LogWarning("Gallery file missing for '{Id}': {Path}", id, filePath);
            return null;
        }

        var content = File.ReadAllBytes(filePath);
        string? sample = null;
        if (!string.IsNullOrWhiteSpace(entry.Sample))
        {
            var samplePath = Path.Combine(_root, entry.Sample.Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(samplePath)) sample = File.ReadAllText(samplePath);
        }

        return new GalleryTemplateAsset(entry.Id, entry.Name, Path.GetFileName(filePath), entry.FileType, content, sample);
    }

    /// <summary>Walk up from <paramref name="start"/> looking for a `gallery/gallery.json`.</summary>
    private static string? FindGalleryRoot(string start)
    {
        var dir = new DirectoryInfo(start);
        for (var i = 0; i < 6 && dir is not null; i++)
        {
            var candidate = Path.Combine(dir.FullName, "gallery");
            if (File.Exists(Path.Combine(candidate, "gallery.json"))) return candidate;
            dir = dir.Parent;
        }
        return null;
    }

    private List<ManifestEntry> LoadManifest()
    {
        var manifestPath = Path.Combine(_root, "gallery.json");
        if (!File.Exists(manifestPath))
        {
            _logger.LogWarning("Gallery manifest not found at {Path}; gallery will be empty", manifestPath);
            return new List<ManifestEntry>();
        }

        try
        {
            var json = File.ReadAllText(manifestPath);
            return JsonSerializer.Deserialize<List<ManifestEntry>>(json, JsonOpts) ?? new List<ManifestEntry>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read gallery manifest at {Path}", manifestPath);
            return new List<ManifestEntry>();
        }
    }

    private sealed class ManifestEntry
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public string File { get; set; } = string.Empty;
        public string? Thumbnail { get; set; }
        public string? Sample { get; set; }
    }
}
