namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Read-only catalog of curated, ready-made templates a user can import.
/// Backed by a pluggable source (bundled folder by default).
/// </summary>
public interface IGalleryService
{
    /// <summary>List all gallery templates (manifest metadata only).</summary>
    IReadOnlyList<GalleryTemplateInfo> List();

    /// <summary>Load a single gallery template's file bytes + sample payload, or null if not found.</summary>
    GalleryTemplateAsset? Get(string id);

    /// <summary>Full path of a gallery template's preview image (page 1 rendered with its sample), or null.</summary>
    string? GetThumbnailPath(string id);
}

/// <summary>Manifest metadata for one gallery template.</summary>
public record GalleryTemplateInfo(
    string Id,
    string Name,
    string Description,
    string Category,
    string FileType,
    bool HasThumbnail);

/// <summary>A gallery template's downloadable content + optional sample render payload.</summary>
public record GalleryTemplateAsset(
    string Id,
    string Name,
    string FileName,
    string FileType,
    byte[] Content,
    string? SampleJson);
