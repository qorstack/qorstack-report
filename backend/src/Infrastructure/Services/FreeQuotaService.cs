using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services;

/// <summary>
/// Default quota service for self-hosted (OSS) deployments.
/// Always authorizes report creation without any billing or quota deductions.
/// </summary>
public class FreeQuotaService : IReportJobQuotaService
{
    public Task<string?> AuthorizeAndChargeAsync(Guid userId, Guid jobId, CancellationToken cancellationToken)
        => Task.FromResult<string?>("FREE");
}
