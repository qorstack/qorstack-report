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

    /// <summary>Whether project members and invitations are available (requires Pro license).</summary>
    bool ProjectMembers { get; }
}
