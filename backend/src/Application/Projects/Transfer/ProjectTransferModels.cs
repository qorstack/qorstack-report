using System.Text.Json;
using System.Text.Json.Serialization;

namespace QorstackReportService.Application.Projects.Transfer;

/// <summary>
/// manifest.json of a project export ZIP (format "qorstack-project").
/// ZIP layout: <c>templates/{key}/v{version}/{fileName}</c>, <c>assets/{key}/{fileName}</c>, <c>fonts/{fileName}</c>.
/// Paths are always rebuilt from validated manifest values on import — never read from the manifest directly.
/// </summary>
public sealed class ProjectTransferManifest
{
    [JsonPropertyName("format")] public string Format { get; set; } = ProjectTransferRules.Format;
    [JsonPropertyName("formatVersion")] public int FormatVersion { get; set; } = ProjectTransferRules.FormatVersion;
    [JsonPropertyName("exportedAt")] public DateTime ExportedAt { get; set; }
    [JsonPropertyName("appVersion")] public string? AppVersion { get; set; }
    [JsonPropertyName("project")] public ManifestProject Project { get; set; } = new();
    [JsonPropertyName("templates")] public List<ManifestTemplate> Templates { get; set; } = new();
    [JsonPropertyName("fonts")] public List<ManifestFont> Fonts { get; set; } = new();
}

public sealed class ManifestProject
{
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("logEnabled")] public bool LogEnabled { get; set; } = true;
    [JsonPropertyName("logRetentionDays")] public int LogRetentionDays { get; set; } = 90;
}

public sealed class ManifestTemplate
{
    [JsonPropertyName("key")] public string Key { get; set; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    /// <summary>"word" or "excel".</summary>
    [JsonPropertyName("type")] public string Type { get; set; } = "word";
    [JsonPropertyName("version")] public int Version { get; set; }
    [JsonPropertyName("fileName")] public string FileName { get; set; } = string.Empty;
    [JsonPropertyName("sha256")] public string Sha256 { get; set; } = string.Empty;
    /// <summary>The builder's saved test data, unchanged (storage paths are rewritten on import).</summary>
    [JsonPropertyName("sandboxPayload")] public JsonElement? SandboxPayload { get; set; }
    [JsonPropertyName("assets")] public List<ManifestAsset> Assets { get; set; } = new();
}

public sealed class ManifestAsset
{
    /// <summary>The storage path used in the sandbox payload of the source deployment (minio:...).</summary>
    [JsonPropertyName("source")] public string Source { get; set; } = string.Empty;
    [JsonPropertyName("fileName")] public string FileName { get; set; } = string.Empty;
    [JsonPropertyName("sha256")] public string Sha256 { get; set; } = string.Empty;
}

public sealed class ManifestFont
{
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("family")] public string Family { get; set; } = string.Empty;
    [JsonPropertyName("subFamily")] public string SubFamily { get; set; } = string.Empty;
    [JsonPropertyName("weight")] public short Weight { get; set; } = 400;
    [JsonPropertyName("italic")] public bool Italic { get; set; }
    [JsonPropertyName("fileName")] public string FileName { get; set; } = string.Empty;
    [JsonPropertyName("sha256")] public string Sha256 { get; set; } = string.Empty;
}

/// <summary>Import plan (dryRun=true) or result (dryRun=false).</summary>
public sealed class ProjectImportResult
{
    public bool DryRun { get; set; }
    public bool Applied { get; set; }
    public string? SourceProject { get; set; }
    public DateTime? ExportedAt { get; set; }
    public List<ImportTemplateItem> Templates { get; set; } = new();
    public List<ImportFontItem> Fonts { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public sealed class ImportTemplateItem
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>"create", "update" or "skip".</summary>
    public string Action { get; set; } = ImportAction.Skip;
    public int? FromVersion { get; set; }
    /// <summary>Version number the import creates (or would create) in this project.</summary>
    public int ToVersion { get; set; }
    public string? Reason { get; set; }
    /// <summary>What differs from the template already in this project (empty for new and unchanged templates).</summary>
    public List<ImportChange> Changes { get; set; } = new();
    /// <summary>The template exists here with the same file, name and test data.</summary>
    public bool Unchanged { get; set; }
    /// <summary>After applying: "imported" or "failed" (null in a dry run and for skipped items).</summary>
    public string? Result { get; set; }
    /// <summary>Why this item failed to import.</summary>
    public string? Error { get; set; }
}

/// <summary>One difference between the imported template and the one in this project.</summary>
public sealed class ImportChange
{
    /// <summary>"file", "fields", "name", "testData" or "key".</summary>
    public string Kind { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public List<string> Added { get; set; } = new();
    public List<string> Removed { get; set; } = new();
}

public static class ImportChangeKind
{
    public const string File = "file";
    public const string Fields = "fields";
    public const string Name = "name";
    public const string TestData = "testData";
    /// <summary>No template with this key here, but one with the same name exists (key renamed?).</summary>
    public const string Key = "key";
}

public sealed class ImportFontItem
{
    public string Name { get; set; } = string.Empty;
    /// <summary>"create" or "skip".</summary>
    public string Action { get; set; } = ImportAction.Skip;
    public string? Reason { get; set; }
    /// <summary>After applying: "imported" or "failed".</summary>
    public string? Result { get; set; }
    public string? Error { get; set; }
}

public static class ImportItemResult
{
    public const string Imported = "imported";
    public const string Failed = "failed";
}

/// <summary>
/// One line of the streamed import (POST …/import?dryRun=false&amp;stream=true, application/x-ndjson):
/// "start" (total), then "font" / "template" per item as it finishes, then "done" with the full result.
/// </summary>
public sealed record ImportProgressEvent(string Type, int Done, int Total, string? Name = null, string? Key = null,
    string? Result = null, string? Error = null);

public static class ImportAction
{
    public const string Create = "create";
    public const string Update = "update";
    public const string Skip = "skip";
}
