using Npgsql;

namespace QorstackReportService.Infrastructure.Services.Render;

/// <summary>A queued async render claimed by one worker.</summary>
public sealed record ClaimedRenderJob(
    Guid Id,
    Guid UserId,
    Guid? TemplateId,
    string Payload,
    int Attempts,
    int MaxAttempts,
    string? WebhookUrl);

/// <summary>A finished async job whose webhook is due, claimed by one sender.</summary>
public sealed record DueWebhook(Guid JobId, string Url, string Status, string? OutputFilePath, string? Error, int Attempts);

/// <summary>
/// Queue operations on <c>report_jobs</c> (rows with a payload are async renders), written as plain SQL so the
/// claim is one atomic statement. <c>FOR UPDATE SKIP LOCKED</c> lets any number of workers — in this process or
/// in other backend instances — claim jobs at the same time without ever getting the same one.
/// </summary>
public sealed class RenderJobStore
{
    public const string Channel = "render_jobs";

    private readonly NpgsqlDataSource _dataSource;

    public RenderJobStore(NpgsqlDataSource dataSource) => _dataSource = dataSource;

    /// <summary>
    /// Takes the oldest due job: pending (and past its retry delay), or processing with an expired lease
    /// (its worker crashed or the server restarted). Returns null when nothing is due.
    /// </summary>
    public async Task<ClaimedRenderJob?> ClaimAsync(string workerId, TimeSpan lease, CancellationToken ct)
    {
        const string sql = """
            UPDATE report_jobs AS j
            SET status = 'processing',
                locked_by = @worker,
                locked_until = now() + make_interval(secs => @lease),
                attempts = j.attempts + 1,
                started_at = COALESCE(j.started_at, now()),
                updated_datetime = now()
            WHERE j.id = (
                SELECT q.id FROM report_jobs AS q
                WHERE q.payload IS NOT NULL
                  AND ((q.status = 'pending' AND (q.available_at IS NULL OR q.available_at <= now()))
                    OR (q.status = 'processing' AND q.locked_until < now()))
                ORDER BY q.created_datetime
                FOR UPDATE SKIP LOCKED
                LIMIT 1)
            RETURNING j.id, j.user_id,
                (SELECT tv.template_id FROM template_versions AS tv WHERE tv.id = j.template_version_id),
                j.payload::text, j.attempts, j.max_attempts, j.webhook_url
            """;

        await using var cmd = _dataSource.CreateCommand(sql);
        cmd.Parameters.AddWithValue("worker", workerId);
        cmd.Parameters.AddWithValue("lease", lease.TotalSeconds);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct)) return null;

        return new ClaimedRenderJob(
            reader.GetGuid(0),
            reader.GetGuid(1),
            reader.IsDBNull(2) ? null : reader.GetGuid(2),
            reader.GetString(3),
            reader.GetInt32(4),
            reader.GetInt32(5),
            reader.IsDBNull(6) ? null : reader.GetString(6));
    }

    /// <summary>Extends the lease while a long render runs. False when another worker has taken the job over.</summary>
    public async Task<bool> RenewLeaseAsync(Guid jobId, string workerId, TimeSpan lease, CancellationToken ct)
    {
        await using var cmd = _dataSource.CreateCommand("""
            UPDATE report_jobs
            SET locked_until = now() + make_interval(secs => @lease)
            WHERE id = @id AND locked_by = @worker AND status = 'processing'
            """);
        cmd.Parameters.AddWithValue("id", jobId);
        cmd.Parameters.AddWithValue("worker", workerId);
        cmd.Parameters.AddWithValue("lease", lease.TotalSeconds);
        return await cmd.ExecuteNonQueryAsync(ct) == 1;
    }

    /// <summary>The render handler already stored the result: drop the payload and the lease.</summary>
    public Task CompleteAsync(Guid jobId, CancellationToken ct) => ExecuteAsync("""
        UPDATE report_jobs
        SET payload = NULL, locked_by = NULL, locked_until = NULL, available_at = NULL, updated_datetime = now(),
            webhook_status = CASE WHEN webhook_url IS NOT NULL THEN 'pending' END,
            webhook_next_at = CASE WHEN webhook_url IS NOT NULL THEN now() END
        WHERE id = @id
        """, jobId, null, null, ct);

    /// <summary>Puts the job back in the queue after a transient error.</summary>
    public Task RetryLaterAsync(Guid jobId, TimeSpan delay, string error, CancellationToken ct) => ExecuteAsync("""
        UPDATE report_jobs
        SET status = 'pending', error_message = @error,
            available_at = now() + make_interval(secs => @delay),
            locked_by = NULL, locked_until = NULL, updated_datetime = now()
        WHERE id = @id
        """, jobId, error, delay.TotalSeconds, ct);

    /// <summary>Final failure: the job will not run again.</summary>
    public Task FailAsync(Guid jobId, string error, CancellationToken ct) => ExecuteAsync("""
        UPDATE report_jobs
        SET status = 'failed', error_message = @error, finished_at = now(),
            payload = NULL, locked_by = NULL, locked_until = NULL, available_at = NULL, updated_datetime = now(),
            webhook_status = CASE WHEN webhook_url IS NOT NULL THEN 'pending' END,
            webhook_next_at = CASE WHEN webhook_url IS NOT NULL THEN now() END
        WHERE id = @id
        """, jobId, error, null, ct);

    /// <summary>
    /// Claims the oldest due webhook delivery. The claim pushes <c>webhook_next_at</c> forward by
    /// <paramref name="lease"/> so no other sender picks it up while this one is posting.
    /// </summary>
    public async Task<DueWebhook?> ClaimWebhookAsync(TimeSpan lease, CancellationToken ct)
    {
        const string sql = """
            UPDATE report_jobs AS j
            SET webhook_next_at = now() + make_interval(secs => @lease)
            WHERE j.id = (
                SELECT q.id FROM report_jobs AS q
                WHERE q.webhook_status = 'pending' AND q.webhook_next_at <= now()
                ORDER BY q.webhook_next_at
                FOR UPDATE SKIP LOCKED
                LIMIT 1)
            RETURNING j.id, j.webhook_url, j.status, j.output_file_path, j.error_message, j.webhook_attempts
            """;
        await using var cmd = _dataSource.CreateCommand(sql);
        cmd.Parameters.AddWithValue("lease", lease.TotalSeconds);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct)) return null;
        return new DueWebhook(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.IsDBNull(4) ? null : reader.GetString(4),
            reader.GetInt32(5));
    }

    /// <summary>Records one delivery attempt: sent, retry later, or give up.</summary>
    public async Task RecordWebhookAttemptAsync(Guid jobId, string status, TimeSpan? retryIn, string? error, CancellationToken ct)
    {
        await using var cmd = _dataSource.CreateCommand("""
            UPDATE report_jobs
            SET webhook_attempts = webhook_attempts + 1,
                webhook_status = @status,
                webhook_next_at = CASE WHEN @retry IS NULL THEN NULL ELSE now() + make_interval(secs => @retry) END,
                webhook_last_error = @error
            WHERE id = @id
            """);
        cmd.Parameters.AddWithValue("id", jobId);
        cmd.Parameters.AddWithValue("status", status);
        cmd.Parameters.Add(new NpgsqlParameter("retry", NpgsqlTypes.NpgsqlDbType.Double) { Value = (object?)retryIn?.TotalSeconds ?? DBNull.Value });
        cmd.Parameters.Add(new NpgsqlParameter("error", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)error ?? DBNull.Value });
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private async Task ExecuteAsync(string sql, Guid jobId, string? error, double? delaySeconds, CancellationToken ct)
    {
        await using var cmd = _dataSource.CreateCommand(sql);
        cmd.Parameters.AddWithValue("id", jobId);
        if (error != null) cmd.Parameters.AddWithValue("error", error);
        if (delaySeconds != null) cmd.Parameters.AddWithValue("delay", delaySeconds.Value);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
