namespace QorstackReportService.Application.Common.Webhooks;

/// <summary>What to do after one webhook delivery attempt.</summary>
public abstract record WebhookDeliveryOutcome
{
    public sealed record Sent : WebhookDeliveryOutcome;
    public sealed record RetryAfter(TimeSpan Delay) : WebhookDeliveryOutcome;
    public sealed record GiveUp : WebhookDeliveryOutcome;
}

/// <summary>
/// Webhook delivery retries: 3 attempts in total, waiting 10 s and then 60 s between them.
/// State lives in <c>report_jobs</c>, so a restart only delays the next attempt.
/// </summary>
public static class WebhookRetryPolicy
{
    public const int MaxAttempts = 3;
    private static readonly TimeSpan[] Delays = [TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(60)];

    /// <param name="attemptsMade">Attempts made including the one that just finished (1-based).</param>
    /// <param name="succeeded">Whether that attempt got a 2xx answer.</param>
    public static WebhookDeliveryOutcome Next(int attemptsMade, bool succeeded)
    {
        if (succeeded) return new WebhookDeliveryOutcome.Sent();
        if (attemptsMade >= MaxAttempts) return new WebhookDeliveryOutcome.GiveUp();
        var index = Math.Clamp(attemptsMade - 1, 0, Delays.Length - 1);
        return new WebhookDeliveryOutcome.RetryAfter(Delays[index]);
    }
}
