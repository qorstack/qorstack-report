using QorstackReportService.Application.Common.Utilities;

namespace QorstackReportService.Application.Reports.Commands;

/// <summary>What happens to a queued render after a run fails.</summary>
public abstract record RenderRetryDecision
{
    public sealed record Retry(TimeSpan Delay) : RenderRetryDecision;
    public sealed record Fail : RenderRetryDecision;
}

/// <summary>
/// Retry rules for async renders. Only infrastructure errors (database, network, storage, Gotenberg
/// timeouts) are retried — a bad request or missing template fails the same way every time.
/// </summary>
public static class RenderRetryPolicy
{
    /// <summary>Backoff before attempt 2, 3, … (the last value repeats).</summary>
    public static readonly IReadOnlyList<TimeSpan> Backoff = [TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(60)];

    /// <param name="attempts">Claims so far, including the run that just failed (1-based).</param>
    public static RenderRetryDecision Decide(int attempts, int maxAttempts, Exception error)
    {
        if (attempts >= maxAttempts || !IsTransient(error)) return new RenderRetryDecision.Fail();
        var delay = Backoff[Math.Clamp(attempts - 1, 0, Backoff.Count - 1)];
        return new RenderRetryDecision.Retry(delay);
    }

    public static bool IsTransient(Exception error) => ExceptionUtility.IsInfrastructureException(error);

    /// <summary>
    /// A job reclaimed after its lease expired has already used <paramref name="attempts"/> claims (this claim
    /// included). Past the limit the worker crashed or hung every time: give up instead of rendering again.
    /// </summary>
    public static bool ExceedsAttempts(int attempts, int maxAttempts) => attempts > maxAttempts;

    /// <summary>
    /// Same rule as the claim query: pending and due, or processing with an expired lease. Only rows with a
    /// payload are queue jobs (synchronous renders also write report_jobs rows, without one).
    /// </summary>
    public static bool IsClaimable(string? status, bool hasPayload, DateTime? availableAt, DateTime? lockedUntil, DateTime now) =>
        hasPayload && status switch
        {
            "pending" => availableAt == null || availableAt <= now,
            "processing" => lockedUntil != null && lockedUntil < now,
            _ => false
        };
}
