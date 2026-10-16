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
    public int ToVersion { get; set; }
    public string? Reason { get; set; }
}

public sealed class ImportFontItem
{
    public string Name { get; set; } = string.Empty;
    /// <summary>"create" or "skip".</summary>
    public string Action { get; set; } = ImportAction.Skip;
    public string? Reason { get; set; }
}

public static class ImportAction
{
    public const string Create = "create";
    public const string Update = "update";
    public const string Skip = "skip";
}
