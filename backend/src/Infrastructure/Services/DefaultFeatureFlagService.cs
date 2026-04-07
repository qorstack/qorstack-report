using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services;

/// <summary>
/// OSS default: all Pro feature flags return false.
/// Replaced at startup by ProFeatureFlagService when a valid Pro license is present.
/// </summary>
public class DefaultFeatureFlagService : IFeatureFlagService
{
    public bool PdfPasswordProtection => false;
    public bool PdfWatermark => false;
    public bool ProjectMembers => false;
}
