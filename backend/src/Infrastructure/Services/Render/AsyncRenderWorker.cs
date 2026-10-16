using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Utilities;
using QorstackReportService.Application.Common.Webhooks;
using QorstackReportService.Application.Reports.Commands;
using QorstackReportService.Application.Reports.Commands.QueueRender;
using QorstackReportService.Domain.Enums;
using QorstackReportService.Infrastructure.Data;
using AppValidationException = QorstackReportService.Application.Common.Exceptions.ValidationException;

namespace QorstackReportService.Infrastructure.Services.Render;

/// <summary>
/// Runs queued async renders stored in <c>report_jobs</c>. Each instance runs <c>Render:AsyncWorkers</c> workers
/// (default 2); several backend instances can share the queue.
/// <list type="bullet">
/// <item>Wake-up: Postgres <c>LISTEN render_jobs</c>, plus a poll every <c>Render:PollSeconds</c> (default 5).</item>
/// <item>A claimed job holds a lease (<c>Render:JobLeaseSeconds</c>, default 300) that is renewed while it renders.
/// If the worker dies or the server restarts, the lease expires and another worker picks the job up again.</item>
/// <item>Infrastructure errors are retried (after 10 s, then 60 s) up to the job's max attempts (3);
/// any other error fails the job at once. Finished jobs drop their payload.</item>
/// <item>Webhooks: a finished job with <c>webhookUrl</c> is marked for delivery in the database; a sender loop posts it
/// (3 tries: now, +10 s, +60 s). Delivery state is stored, so restarts only delay it.</item>
/// </list>
/// The render itself runs through the same MediatR handlers as a synchronous render.
/// </summary>
public sealed class AsyncRenderWorker : BackgroundService
{
    private readonly RenderJobStore _store;
    private readonly NpgsqlDataSource _dataSource;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly WebhookSender _webhooks;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AsyncRenderWorker> _logger;
    private readonly SemaphoreSlim _wake = new(0);
    private readonly SemaphoreSlim _webhookWake = new(0);
    private static readonly TimeSpan WebhookClaimLease = TimeSpan.FromSeconds(60);
    private readonly TimeSpan _lease;
    private readonly TimeSpan _poll;
    private readonly int _workers;

    public AsyncRenderWorker(
        RenderJobStore store,
        NpgsqlDataSource dataSource,
        IServiceScopeFactory scopeFactory,
        WebhookSender webhooks,
        IConfiguration configuration,
        ILogger<AsyncRenderWorker> logger)
    {
        _store = store;
        _dataSource = dataSource;
        _scopeFactory = scopeFactory;
        _webhooks = webhooks;
        _configuration = configuration;
        _logger = logger;
        _workers = Math.Clamp(configuration.GetValue("Render:AsyncWorkers", 2), 1, 32);
        _lease = TimeSpan.FromSeconds(Math.Max(30, configuration.GetValue("Render:JobLeaseSeconds", 300)));
        _poll = TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Render:PollSeconds", 5), 1, 300));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // DatabaseMigrationService runs in StartAsync, so the queue columns exist before this starts.
        var instance = $"{Environment.MachineName}:{Environment.ProcessId}";
        var tasks = Enumerable.Range(0, _workers)
            .Select(i => RunWorkerAsync($"{instance}:{i}", stoppingToken))
            .Append(ListenAsync(stoppingToken))
            .Append(RunWebhookLoopAsync(stoppingToken));
        await Task.WhenAll(tasks);
    }

    /// <summary>Holds a LISTEN connection and wakes idle workers on every notification. Reconnects on errors.</summary>
    private async Task ListenAsync(CancellationToken ct)
    {
        var retry = 0;
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await using var conn = await _dataSource.OpenConnectionAsync(ct);
                conn.Notification += (_, _) => WakeWorkers();
                await using (var cmd = new NpgsqlCommand($"LISTEN {RenderJobStore.Channel}", conn))
                    await cmd.ExecuteNonQueryAsync(ct);
                retry = 0;
                WakeWorkers(); // pick up anything queued while we were not listening
                while (!ct.IsCancellationRequested)
                    await conn.WaitAsync(ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { return; }
            catch (Exception ex)
            {
                var delay = TimeSpan.FromSeconds(Math.Min(30, Math.Pow(2, retry++)));
                _logger.LogWarning(ex, "[AsyncRender] LISTEN connection lost; reconnecting in {Delay}s (workers keep polling)", delay.TotalSeconds);
                try { await Task.Delay(delay, ct); }
                catch (OperationCanceledException) { return; }
            }
        }
    }

    private void WakeWorkers()
    {
        var missing = _workers - _wake.CurrentCount;
        if (missing > 0) _wake.Release(missing);
    }

    private async Task RunWorkerAsync(string workerId, CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                var job = await _store.ClaimAsync(workerId, _lease, ct);
                if (job != null)
                {
                    await ProcessAsync(job, workerId, ct);
                    continue; // look for the next job right away
                }
                await _wake.WaitAsync(_poll, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { return; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AsyncRender] Worker {Worker} could not read the queue", workerId);
                try { await Task.Delay(_poll, ct); }
                catch (OperationCanceledException) { return; }
            }
        }
    }

    private async Task ProcessAsync(ClaimedRenderJob job, string workerId, CancellationToken ct)
    {
        if (RenderRetryPolicy.ExceedsAttempts(job.Attempts, job.MaxAttempts))
        {
            await FinishFailedAsync(job, $"The job was interrupted {job.MaxAttempts} times (server restarts or crashes). Submit the render again.", ct);
            return;
        }

        IRenderJobCommand command;
        try
        {
            command = RenderJobPayload.Deserialize(job.Payload);
            command.JobId = job.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AsyncRender] Job {JobId} has an unreadable payload", job.Id);
            await FinishFailedAsync(job, $"Rendering failed (job {job.Id}). See the server log for details.", ct);
            return;
        }

        using var renewCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        var renewal = RenewLeaseAsync(job.Id, workerId, renewCts.Token);
        try
        {
            using (var scope = _scopeFactory.CreateScope())
                await scope.ServiceProvider.GetRequiredService<ISender>().Send(command, ct);

            await _store.CompleteAsync(job.Id, CancellationToken.None);
            await DeleteAsyncAssetsAsync(job);
            WakeWebhooks(job);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // Shutting down: keep the job claimed; its lease expires and another worker retries it.
        }
        catch (Exception ex)
        {
            var error = Describe(ex, job.Id);
            switch (RenderRetryPolicy.Decide(job.Attempts, job.MaxAttempts, ex))
            {
                case RenderRetryDecision.Retry retry:
                    _logger.LogWarning(ex, "[AsyncRender] Job {JobId} attempt {Attempt}/{Max} failed; retrying in {Delay}s",
                        job.Id, job.Attempts, job.MaxAttempts, retry.Delay.TotalSeconds);
                    await _store.RetryLaterAsync(job.Id, retry.Delay, error, CancellationToken.None);
                    break;
                default:
                    _logger.LogError(ex, "[AsyncRender] Job {JobId} failed", job.Id);
                    await FinishFailedAsync(job, error, ct);
                    break;
            }
        }
        finally
        {
            await renewCts.CancelAsync();
            try { await renewal; } catch (OperationCanceledException) { }
        }
    }

    /// <summary>Renews the lease every third of its length so long renders are not taken over.</summary>
    private async Task RenewLeaseAsync(Guid jobId, string workerId, CancellationToken ct)
    {
        using var timer = new PeriodicTimer(_lease / 3);
        while (await timer.WaitForNextTickAsync(ct))
        {
            try
            {
                if (!await _store.RenewLeaseAsync(jobId, workerId, _lease, ct))
                    _logger.LogWarning("[AsyncRender] Lost the lease on job {JobId}", jobId);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "[AsyncRender] Could not renew the lease on job {JobId}", jobId);
            }
        }
    }

    private async Task FinishFailedAsync(ClaimedRenderJob job, string error, CancellationToken ct)
    {
        await _store.FailAsync(job.Id, error, CancellationToken.None);
        await DeleteAsyncAssetsAsync(job);
        WakeWebhooks(job);
    }

    /// <summary>Error text stored on the job: validation and other known errors as-is, unknown ones masked.</summary>
    public static string Describe(Exception ex, Guid jobId) => ex switch
    {
        AppValidationException v when v.ValidationErrors.Count > 0 =>
            string.Join(" ", v.ValidationErrors.Select(e => $"{e.Key}: {e.Message}")),
        _ when ExceptionUtility.IsKnownException(ex) => ex.Message,
        _ => $"Rendering failed (job {jobId}). See the server log for details."
    };

    /// <summary>Images uploaded with the request are only needed for this job.</summary>
    private async Task DeleteAsyncAssetsAsync(ClaimedRenderJob job)
    {
        if (job.TemplateId == null) return;
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var storage = scope.ServiceProvider.GetRequiredService<IMinioStorageService>();
            await storage.DeleteByPrefixAsync(StorageAreas.Reports,
                QueueRenderCommandHandler.AssetPrefix(job.UserId, job.TemplateId.Value, job.Id) + "/");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[AsyncRender] Could not delete the uploaded images of job {JobId}", job.Id);
        }
    }

    private void WakeWebhooks(ClaimedRenderJob job)
    {
        if (!string.IsNullOrEmpty(job.WebhookUrl) && _webhookWake.CurrentCount == 0) _webhookWake.Release();
    }

    /// <summary>Delivers due webhooks one at a time; state (attempts, next try, last error) lives in report_jobs.</summary>
    private async Task RunWebhookLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                var due = await _store.ClaimWebhookAsync(WebhookClaimLease, ct);
                if (due == null)
                {
                    await _webhookWake.WaitAsync(_poll, ct);
                    continue;
                }
                await DeliverWebhookAsync(due, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { return; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Webhook] Could not read due webhooks");
                try { await Task.Delay(_poll, ct); }
                catch (OperationCanceledException) { return; }
            }
        }
    }

    private async Task DeliverWebhookAsync(DueWebhook due, CancellationToken ct)
    {
        string? url = null;
        int? expiresIn = null;
        var succeeded = string.Equals(due.Status, ReportJobStatus.Success.ToString(), StringComparison.OrdinalIgnoreCase);
        if (succeeded && due.OutputFilePath != null)
        {
            using var scope = _scopeFactory.CreateScope();
            var storage = scope.ServiceProvider.GetRequiredService<IMinioStorageService>();
            expiresIn = int.Parse(_configuration["QorstackReport:TempFileExpiryMinutes"] ?? "60") * 60;
            url = await storage.GetPresignedUrlAsync(StorageAreas.Reports, due.OutputFilePath, expiresIn.Value);
        }

        var payload = new RenderWebhookPayload(due.JobId, due.Status, url, expiresIn, succeeded ? null : due.Error);
        var error = await _webhooks.TrySendAsync(due.Url, payload, ct);
        var attempts = due.Attempts + 1;
        switch (WebhookRetryPolicy.Next(attempts, error == null))
        {
            case WebhookDeliveryOutcome.Sent:
                await _store.RecordWebhookAttemptAsync(due.JobId, "sent", null, null, CancellationToken.None);
                break;
            case WebhookDeliveryOutcome.RetryAfter retry:
                await _store.RecordWebhookAttemptAsync(due.JobId, "pending", retry.Delay, error, CancellationToken.None);
                break;
            default:
                _logger.LogWarning("[Webhook] Job {JobId}: giving up after {Attempts} attempts ({Error}); the result is still available from GET /render/jobs/{JobId}",
                    due.JobId, attempts, error, due.JobId);
                await _store.RecordWebhookAttemptAsync(due.JobId, "failed", null, error, CancellationToken.None);
                break;
        }
    }

    public override void Dispose()
    {
        _wake.Dispose();
        _webhookWake.Dispose();
        base.Dispose();
    }
}
