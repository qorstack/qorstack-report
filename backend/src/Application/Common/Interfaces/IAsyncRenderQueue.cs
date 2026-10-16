namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Async render queue (Pro). Jobs live in <c>report_jobs</c> (rows with a payload); this only wakes the workers
/// after a job was inserted. Workers also poll, so a lost notification only delays a job by a few seconds.
/// </summary>
public interface IAsyncRenderQueue
{
    /// <summary>Tells every backend instance that a new job is waiting (Postgres NOTIFY).</summary>
    Task NotifyAsync(CancellationToken cancellationToken);
}
