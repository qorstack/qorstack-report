using System.IO.Compression;
using System.Text.Json;

namespace QorstackReportService.Application.Projects.Transfer;

/// <summary>Reads and checks an import ZIP before anything else touches it.</summary>
public static class ProjectTransferArchive
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Entry count, zip-slip paths, expanded size and the manifest. Throws a ValidationException (400)
    /// with a plain message when the archive can't be used.
    /// </summary>
    public static async Task<(Dictionary<string, ZipArchiveEntry> Entries, ProjectTransferManifest Manifest)> OpenAsync(
        ZipArchive zip, long maxUncompressedBytes, CancellationToken ct)
    {
        if (zip.Entries.Count > ProjectTransferRules.MaxEntries)
            throw new ValidationException($"The archive has too many files ({zip.Entries.Count}, max {ProjectTransferRules.MaxEntries}).");
        if (zip.Entries.Any(e => !ProjectTransferRules.IsSafeEntryName(e.FullName)))
            throw new ValidationException("The archive contains an unsafe path (absolute path or \"..\"). It was not created by Qorstack export.");
        if (zip.Entries.Sum(e => e.Length) > maxUncompressedBytes)
            throw new ValidationException("The archive expands to more data than allowed.");

        var entries = zip.Entries.Where(e => !e.FullName.EndsWith('/')).ToDictionary(e => e.FullName, StringComparer.Ordinal);
        if (!entries.TryGetValue(ProjectTransferRules.ManifestEntry, out var entry))
            throw new ValidationException("manifest.json is missing — this is not a Qorstack project export.");
        if (entry.Length > ProjectTransferRules.MaxManifestBytes)
            throw new ValidationException("manifest.json is too large.");

        ProjectTransferManifest? manifest;
        try
        {
            await using var stream = entry.Open();
            manifest = await JsonSerializer.DeserializeAsync<ProjectTransferManifest>(stream, Json, ct);
        }
        catch (JsonException) { manifest = null; }

        var errors = ProjectTransferRules.ValidateManifest(manifest);
        if (errors.Count > 0) throw new ValidationException(string.Join(" ", errors));
        return (entries, manifest!);
    }

    /// <summary>The entry's bytes, or null when it is missing or its SHA-256 differs from the manifest.</summary>
    public static async Task<byte[]?> ReadVerifiedAsync(Dictionary<string, ZipArchiveEntry> entries, string path, string sha256, CancellationToken ct)
    {
        if (!entries.TryGetValue(path, out var entry)) return null;
        await using var stream = entry.Open();
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();
        return string.Equals(ProjectTransferRules.Sha256Hex(bytes), sha256.Trim(), StringComparison.OrdinalIgnoreCase) ? bytes : null;
    }
}
