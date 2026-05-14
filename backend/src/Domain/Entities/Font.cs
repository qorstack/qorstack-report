using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// Stores font metadata. Files are in local volume or MinIO depending on configuration.
/// </summary>
public partial class Font
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string FamilyName { get; set; } = null!;

    public string SubFamilyName { get; set; } = null!;

    /// <summary>
    /// Font weight: 100=Thin, 400=Regular, 700=Bold, 900=Black.
    /// </summary>
    public short Weight { get; set; }

    public bool IsItalic { get; set; }

    public string FileFormat { get; set; } = null!;

    public long FileSizeBytes { get; set; }

    public string FileHash { get; set; } = null!;

    public string? StorageBucket { get; set; }

    public string StorageKey { get; set; } = null!;

    public string? PreviewImageKey { get; set; }

    public string SyncSource { get; set; } = null!;

    /// <summary>
    /// System font available to all projects without requiring ownership.
    /// </summary>
    public bool IsSystemFont { get; set; }

    public bool IsActive { get; set; }

    public string? Description { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime CreatedDatetime { get; set; }

    public string? UpdatedBy { get; set; }

    public DateTime? UpdatedDatetime { get; set; }

    public virtual ICollection<FontOwnership> FontOwnerships { get; set; } = new List<FontOwnership>();
}
