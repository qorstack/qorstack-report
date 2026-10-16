namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Reports which optional features are enabled in the current deployment.
/// OSS default (License=free): all Pro features return false.
/// Pro deployment (License=pro or valid license file): returns true for licensed features.
/// </summary>
public interface IFeatureFlagService
{
    /// <summary>Whether PDF password protection is available (requires Pro license).</summary>
    bool PdfPasswordProtection { get; }

    /// <summary>Whether PDF watermarking is available (requires Pro license).</summary>
    bool PdfWatermark { get; }

    /// <summary>Whether automatic live preview rendering is available (free in every edition).</summary>
    bool LivePreview { get; }

    /// <summary>Whether project members and invitations are available.</summary>
    bool ProjectMembers { get; }

    /// <summary>Max template versions retained per template. Free=1, Pro=10.</summary>
    int MaxTemplateVersions { get; }

    /// <summary>Whether users can specify a custom template key instead of auto-generated (requires Pro license).</summary>
    bool CustomTemplateKey { get; }

    /// <summary>Whether users can download generated files as a ZIP archive (requires Pro license).</summary>
    bool DownloadAsZip { get; }

    /// <summary>Whether auto-detection of template variables is available.</summary>
    bool AutoDetectVariables { get; }

    /// <summary>Pro: "async": true on render requests (queued jobs, polling, webhooks).</summary>
    bool AsyncRender { get; }

    /// <summary>Export / import a whole project as a ZIP (Pro).</summary>
    bool ProjectTransfer { get; }
}
