namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Logical storage areas. Everything lives in ONE bucket (<c>Minio:Bucket</c>); each area is a folder in it.
/// Code and stored paths (<c>minio:{area}/{key}</c>, <c>fonts.storage_bucket</c>) always use these area names —
/// <see cref="IMinioStorageService"/> maps them to the physical bucket + folder.
/// </summary>
public static class StorageAreas
{
    /// <summary>Uploaded Word/Excel templates and their thumbnails → folder <c>template/</c>.</summary>
    public const string Templates = "templates";

    /// <summary>Generated reports, sandbox assets and temporary downloads → folder <c>generated-report/</c>.</summary>
    public const string Reports = "reports";

    /// <summary>User-uploaded fonts → folder <c>fonts/</c>.</summary>
    public const string Fonts = "fonts";

    /// <summary>Area name → folder (with trailing slash) inside the bucket.</summary>
    public static readonly IReadOnlyDictionary<string, string> Folders = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        [Templates] = "template/",
        [Reports] = "generated-report/",
        [Fonts] = "fonts/"
    };
}
