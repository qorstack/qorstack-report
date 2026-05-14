using Microsoft.Extensions.Configuration;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services;

/// <summary>
/// OSS default feature flags.
/// Reads App:Mode from configuration to determine demo vs selfhost mode.
/// Replaced at startup by ProFeatureFlagService when a valid Pro license is present.
/// </summary>
public class DefaultFeatureFlagService : IFeatureFlagService
{
    private readonly bool _isDemo;

    public DefaultFeatureFlagService(IConfiguration configuration)
    {
        _isDemo = string.Equals(
            configuration["App:Mode"], "demo",
            StringComparison.OrdinalIgnoreCase);
    }

    public bool PdfPasswordProtection => false;
    public bool PdfWatermark => false;
    public bool LivePreview => false;
    public bool ProjectMembers => true;
    public bool IsDemo => _isDemo;
    public bool IsSelfhost => !_isDemo;
    public int MaxTemplateVersions => _isDemo ? 1 : 10;
    public bool CustomTemplateKey => !_isDemo;
}
