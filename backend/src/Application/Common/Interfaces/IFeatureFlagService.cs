namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Reports which optional features are enabled in the current deployment.
/// OSS default: all Pro features return false.
/// Pro deployment: returns true for licensed features.
/// </summary>
public interface IFeatureFlagService
{
    /// <summary>Whether PDF password protection is available (requires Pro license).</summary>
    bool PdfPasswordProtection { get; }

    /// <summary>Whether PDF watermarking is available (requires Pro license).</summary>
    bool PdfWatermark { get; }

    /// <summary>Whether automatic live preview rendering is available (requires Pro license).</summary>
    bool LivePreview { get; }

    /// <summary>Whether project members and invitations are available.</summary>
    bool ProjectMembers { get; }

    /// <summary>
    /// True when App:Mode = "demo". Exports are automatically watermarked with "Qorstack Report".
    /// Rate limits and project count limits apply.
    /// </summary>
    bool IsDemo { get; }

    /// <summary>True when App:Mode = "selfhost" (default). No watermarks, no limits.</summary>
    bool IsSelfhost { get; }

    /// <summary>Max template versions retained per template. Free=1, Pro=10.</summary>
    int MaxTemplateVersions { get; }

    /// <summary>Whether users can specify a custom template key instead of auto-generated (requires Pro license).</summary>
    bool CustomTemplateKey { get; }
}
