using Npgsql;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services.Render;

/// <summary>
/// Wakes the async render workers of every backend instance (Postgres <c>NOTIFY render_jobs</c>).
/// The job itself is already stored in <c>report_jobs</c>; workers poll too, so a lost notification
/// only delays a job by <c>Render:PollSeconds</c>.
/// </summary>
public sealed class AsyncRenderQueue : IAsyncRenderQueue
{
    private readonly NpgsqlDataSource _dataSource;

    public AsyncRenderQueue(NpgsqlDataSource dataSource) => _dataSource = dataSource;

    public async Task NotifyAsync(CancellationToken cancellationToken)
    {
        await using var cmd = _dataSource.CreateCommand($"SELECT pg_notify('{RenderJobStore.Channel}', '')");
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }
}
