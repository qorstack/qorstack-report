using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services;

/// <summary>
/// OSS default feature flags — all Pro features disabled.
/// Replaced at startup by ProFeatureFlagService when a valid Pro license is present.
/// </summary>
public class DefaultFeatureFlagService : IFeatureFlagService
{
    public bool PdfPasswordProtection => false;
    public bool PdfWatermark => false;
    public bool LivePreview => true;
    public bool ProjectMembers => true;
    public int MaxTemplateVersions => 1;
    public bool CustomTemplateKey => true;
    public bool DownloadAsZip => false;
    public bool AutoDetectVariables => true;
    public bool AsyncRender => false;
    public bool ProjectTransfer => false;
}
