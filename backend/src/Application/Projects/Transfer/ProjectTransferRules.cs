using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Projects.Transfer;

/// <summary>
/// Pure rules for project export/import: what to do with each template, how ZIP paths and
/// manifest values are validated, and how builder asset paths are found and rewritten.
/// </summary>
public static partial class ProjectTransferRules
{
    public const string Format = "qorstack-project";
    public const int FormatVersion = 1;
    public const string ManifestEntry = "manifest.json";
    public const int MaxEntries = 5_000;
    public const long MaxManifestBytes = 5 * 1024 * 1024;
    public const int MaxVersion = 1_000_000;

    private static readonly string[] TemplateExtensions = [".docx", ".xlsx"];
    private static readonly string[] FontExtensions = [".ttf", ".otf", ".woff", ".woff2"];

    // Keys, file names and folder names that may appear as ONE path segment inside the ZIP.
    [GeneratedRegex(@"^[A-Za-z0-9][A-Za-z0-9._ \-()]{0,127}$")]
    private static partial Regex SafeSegmentPattern();

    /// <summary>One path segment: letters, digits, dot, dash, underscore, space, parentheses; no "..".</summary>
    public static bool IsSafeSegment(string? value) =>
        !string.IsNullOrEmpty(value) && SafeSegmentPattern().IsMatch(value) && !value.Contains("..", StringComparison.Ordinal);

    /// <summary>
    /// ZIP entry names must be relative, forward-slash, without empty or ".." segments
    /// (zip-slip protection — nothing in the archive may point outside it).
    /// </summary>
    public static bool IsSafeEntryName(string? name)
    {
        if (string.IsNullOrEmpty(name) || name.Length > 512) return false;
        if (name.Contains('\\') || name.Contains(':') || name.Contains('\0')) return false;
        if (name.StartsWith('/')) return false;
        var segments = name.TrimEnd('/').Split('/');
        return segments.All(s => s.Length > 0 && s != "." && s != "..");
    }

    public static string TemplatePath(string key, int version, string fileName) => $"templates/{key}/v{version}/{fileName}";
    public static string AssetPath(string key, string fileName) => $"assets/{key}/{fileName}";
    public static string FontPath(string fileName) => $"fonts/{fileName}";

    public static string Sha256Hex(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

    /// <summary>Manifest-level problems that make the whole file unusable (→ 400).</summary>
    public static List<string> ValidateManifest(ProjectTransferManifest? manifest)
    {
        var errors = new List<string>();
        if (manifest == null) { errors.Add("manifest.json is missing or not valid JSON."); return errors; }
        if (manifest.Format != Format)
            errors.Add($"Not a Qorstack project export (format \"{manifest.Format}\", expected \"{Format}\").");
        if (manifest.FormatVersion != FormatVersion)
            errors.Add($"Unsupported export format version {manifest.FormatVersion}. This server reads version {FormatVersion}; export again from a matching Qorstack version.");
        return errors;
    }

    /// <summary>Problems with one template entry (→ the template is skipped with this reason).</summary>
    public static string? ValidateTemplateEntry(ManifestTemplate t)
    {
        if (!IsSafeSegment(t.Key)) return "invalid template key";
        if (t.Version < 1 || t.Version > MaxVersion) return "invalid version number";
        if (!IsSafeSegment(t.FileName)) return "invalid file name";
        var ext = Path.GetExtension(t.FileName).ToLowerInvariant();
        if (!TemplateExtensions.Contains(ext)) return "file must be .docx or .xlsx";
        var expectedType = ext == ".xlsx" ? "excel" : "word";
        if (!string.Equals(t.Type, expectedType, StringComparison.OrdinalIgnoreCase)) return $"type \"{t.Type}\" does not match the {ext} file";
        if (string.IsNullOrWhiteSpace(t.Sha256)) return "missing checksum";
        return null;
    }

    public static string? ValidateFontEntry(ManifestFont f)
    {
        if (!IsSafeSegment(f.FileName)) return "invalid file name";
        if (!FontExtensions.Contains(Path.GetExtension(f.FileName).ToLowerInvariant())) return "unsupported font format";
        if (string.IsNullOrWhiteSpace(f.Sha256)) return "missing checksum";
        return null;
    }

    /// <summary>
    /// The import decision for one template.
    /// </summary>
    /// <param name="sourceVersion">Version in the export.</param>
    /// <param name="targetLatestVersion">Latest version of the same key in the target project, or null when absent.</param>
    /// <param name="keyUsedByAnotherProject">The key already belongs to another project of the same owner.</param>
    /// <param name="contentChanged">
    /// File, name or test data differ from the template here. Version numbers are counted per deployment, so the
    /// same number does not mean the same content — and different numbers can hold the same file.
    /// </param>
    public static (string Action, string? Reason) Decide(int sourceVersion, int? targetLatestVersion, bool keyUsedByAnotherProject, bool contentChanged = true)
    {
        if (targetLatestVersion is null)
        {
            return keyUsedByAnotherProject
                ? (ImportAction.Skip, "key belongs to another project")
                : (ImportAction.Create, "new template");
        }

        if (!contentChanged) return (ImportAction.Skip, "no changes");
        if (sourceVersion > targetLatestVersion) return (ImportAction.Update, $"newer version (v{targetLatestVersion} → v{sourceVersion})");
        if (sourceVersion == targetLatestVersion) return (ImportAction.Update, $"changed (both are v{targetLatestVersion})");
        return (ImportAction.Skip, $"target is newer (v{targetLatestVersion})");
    }

    /// <summary>Version number an import creates: the source number, or the next free one when this project is already there.</summary>
    public static int NewVersionNumber(int sourceVersion, int? targetLatestVersion) =>
        targetLatestVersion is null ? sourceVersion : Math.Max(sourceVersion, targetLatestVersion.Value + 1);

    /// <summary>Field names in <paramref name="source"/> but not in <paramref name="target"/>, and the other way round.</summary>
    public static (List<string> Added, List<string> Removed) DiffFields(IEnumerable<string> source, IEnumerable<string> target)
    {
        var s = source.Distinct(StringComparer.Ordinal).ToList();
        var t = target.Distinct(StringComparer.Ordinal).ToList();
        return (s.Except(t, StringComparer.Ordinal).Order(StringComparer.Ordinal).ToList(),
                t.Except(s, StringComparer.Ordinal).Order(StringComparer.Ordinal).ToList());
    }

    /// <summary>
    /// True when two saved test-data payloads hold the same values. Storage paths differ between deployments
    /// (each import re-uploads the images), so they are compared by file name only.
    /// </summary>
    public static bool SameTestData(string? sourceJson, string? targetJson)
    {
        static string? Normalize(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            JsonNode? root;
            try { root = JsonNode.Parse(json); } catch (JsonException) { return json.Trim(); }
            if (root is null or JsonObject { Count: 0 }) return null;
            root = Walk(root, s => s.StartsWith("minio:", StringComparison.OrdinalIgnoreCase) ? "file:" + CompareName(s) : s);
            return root?.ToJsonString();
        }
        return Normalize(sourceJson) == Normalize(targetJson);
    }

    /// <summary>The sanitised file name an asset gets on import (see <see cref="AssetFileName"/>), without de-duplication.</summary>
    private static string CompareName(string minioPath)
    {
        var name = Regex.Replace(minioPath.Split('/').Last(), @"[^A-Za-z0-9._\-]", "_").TrimStart('.', '_', '-');
        return name.Length > 100 ? name[^100..] : name;
    }

    /// <summary>All storage paths (minio:...) used anywhere in a sandbox payload.</summary>
    public static List<string> FindStoragePaths(string? payloadJson)
    {
        var found = new List<string>();
        if (string.IsNullOrWhiteSpace(payloadJson)) return found;
        JsonNode? root;
        try { root = JsonNode.Parse(payloadJson); } catch (JsonException) { return found; }
        Walk(root, s =>
        {
            if (s.StartsWith("minio:", StringComparison.OrdinalIgnoreCase) && !found.Contains(s)) found.Add(s);
            return s;
        });
        return found;
    }

    /// <summary>Replaces storage paths in a payload (exact string values only). Unknown paths are left as-is.</summary>
    public static string? RewriteStoragePaths(string? payloadJson, IReadOnlyDictionary<string, string> map)
    {
        if (string.IsNullOrWhiteSpace(payloadJson) || map.Count == 0) return payloadJson;
        JsonNode? root;
        try { root = JsonNode.Parse(payloadJson); } catch (JsonException) { return payloadJson; }
        root = Walk(root, s => map.TryGetValue(s, out var replacement) ? replacement : s);
        return root?.ToJsonString();
    }

    /// <summary>A builder asset of this template: minio:reports/sandbox-assets/{user}/{templateId}/...</summary>
    public static bool IsTemplateAsset(string path, Guid templateId)
    {
        if (path.Contains("..", StringComparison.Ordinal)) return false;
        var parts = path.Split('/');
        return parts.Length >= 5
            && parts[0].Equals($"minio:{StorageAreas.Reports}", StringComparison.Ordinal)
            && parts[1] == "sandbox-assets"
            && Guid.TryParse(parts[3], out var id) && id == templateId;
    }

    /// <summary>Object key inside the reports area for an asset of a template (minio path without the area).</summary>
    public static string AssetObjectKey(string minioPath) => minioPath[$"minio:{StorageAreas.Reports}/".Length..];

    /// <summary>Unique, path-safe file name for an asset inside assets/{key}/.</summary>
    public static string AssetFileName(string minioPath, ISet<string> used)
    {
        var raw = minioPath.Split('/').Last();
        var name = Regex.Replace(raw, @"[^A-Za-z0-9._\-]", "_").TrimStart('.', '_', '-');
        if (name.Length == 0) name = "asset";
        if (name.Length > 100) name = name[^100..];
        if (!char.IsLetterOrDigit(name[0])) name = "a" + name;
        var candidate = name;
        for (var i = 2; !used.Add(candidate); i++) candidate = $"{i}-{name}";
        return candidate;
    }

    /// <summary>Lower-case, path-safe slug for the export file name.</summary>
    public static string Slug(string name)
    {
        var slug = Regex.Replace(name.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
        return slug.Length == 0 ? "project" : slug.Length > 60 ? slug[..60].Trim('-') : slug;
    }

    private static JsonNode? Walk(JsonNode? node, Func<string, string> onString)
    {
        switch (node)
        {
            case JsonObject obj:
                foreach (var key in obj.Select(p => p.Key).ToList())
                {
                    var child = obj[key];
                    var result = Walk(child, onString);
                    if (!ReferenceEquals(result, child)) obj[key] = result; // only replace changed values (a node can't be re-parented)
                }
                return obj;
            case JsonArray arr:
                for (var i = 0; i < arr.Count; i++)
                {
                    var child = arr[i];
                    var result = Walk(child, onString);
                    if (!ReferenceEquals(result, child)) arr[i] = result;
                }
                return arr;
            case JsonValue value when value.TryGetValue<string>(out var s):
                var replaced = onString(s);
                return replaced == s ? value : JsonValue.Create(replaced);
            default:
                return node;
        }
    }
}
