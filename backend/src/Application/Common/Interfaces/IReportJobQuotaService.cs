namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Service for authorizing report job creation and charging quota accordingly.
/// The OSS default always allows report creation (self-hosted, no billing).
/// The SaaS implementation enforces subscription quotas and credit wallet deductions.
/// </summary>
public interface IReportJobQuotaService
{
    /// <summary>
    /// Authorize report creation and charge quota if applicable.
    /// </summary>
    /// <param name="userId">The user requesting the report job.</param>
    /// <param name="jobId">The new job ID being created.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// The charge type string (e.g. "FREE", "SUBSCRIPTION", "CREDIT_WALLET", "UNLIMITED")
    /// or <c>null</c> if quota is exhausted and the request should be rejected.
    /// </returns>
    Task<string?> AuthorizeAndChargeAsync(Guid userId, Guid jobId, CancellationToken cancellationToken);
}
