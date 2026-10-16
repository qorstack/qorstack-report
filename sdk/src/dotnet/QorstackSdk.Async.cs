namespace Qorstack.Report.Sdk;

using System;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

// Hand-written helpers (not generated) — survive `pnpm gen:dotnet`.
// Render calls that may answer 200 (file ready) or 202 (queued, "async": true — Pro),
// job polling, and a typed 429 when too many async jobs are pending.

/// <summary>Result of a render call: either the finished file (<see cref="Download"/>) or a queued job (<see cref="Job"/>).</summary>
public sealed class RenderOutcome<TDownload> where TDownload : class
{
    internal RenderOutcome(TDownload? download, ExportPdfAsyncResponse? job)
    {
        Download = download;
        Job = job;
    }

    /// <summary>Set when the render finished in this request (HTTP 200).</summary>
    public TDownload? Download { get; }

    /// <summary>Set when the render was queued (HTTP 202, "async": true). Poll with <see cref="QorstackApi.WaitForJobAsync"/>.</summary>
    public ExportPdfAsyncResponse? Job { get; }

    public bool IsQueued => Job != null;
}

/// <summary>Status of an async render job (GET /render/jobs/{id}).</summary>
public sealed class RenderJobStatus
{
    [Newtonsoft.Json.JsonProperty("id")] public Guid Id { get; set; }

    /// <summary>pending → processing → success | failed</summary>
    [Newtonsoft.Json.JsonProperty("status")] public string? Status { get; set; }

    /// <summary>Fresh download link once <see cref="Status"/> is "success".</summary>
    [Newtonsoft.Json.JsonProperty("downloadUrl")] public string? DownloadUrl { get; set; }

    [Newtonsoft.Json.JsonProperty("downloadUrlExpiresAt")] public DateTimeOffset? DownloadUrlExpiresAt { get; set; }

    [Newtonsoft.Json.JsonProperty("errorMessage")] public string? ErrorMessage { get; set; }

    [Newtonsoft.Json.JsonProperty("durationMs")] public long? DurationMs { get; set; }

    [Newtonsoft.Json.JsonProperty("fileSizeBytes")] public long? FileSizeBytes { get; set; }

    public bool IsFinished => Status is "success" or "failed";
}

/// <summary>HTTP 429: too many unfinished async renders for this user. Retry after <see cref="RetryAfter"/>.</summary>
public sealed class RenderQueueFullException : Exception
{
    public RenderQueueFullException(TimeSpan? retryAfter, Exception? inner = null)
        : base("Too many async renders are pending. Retry later.", inner) => RetryAfter = retryAfter;

    public TimeSpan? RetryAfter { get; }
}

/// <summary>The async render job finished with status "failed".</summary>
public sealed class RenderJobFailedException : Exception
{
    public RenderJobFailedException(RenderJobStatus job)
        : base($"Render job {job.Id} failed: {job.ErrorMessage ?? "unknown error"}") => Job = job;

    public RenderJobStatus Job { get; }
}

public partial class QorstackApi
{
    /// <summary>Render from a Word template. Returns the file link (200) or, with "async": true (Pro), the queued job (202).</summary>
    public async Task<RenderOutcome<ExportPdfUrlResponse>> RenderWordAsync(PdfFromTemplateRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            return new(await PostRenderWordTemplateAsync(request, cancellationToken).ConfigureAwait(false), null);
        }
        catch (ApiException<ExportPdfAsyncResponse> queued) when (queued.StatusCode == 202)
        {
            return new(null, queued.Result);
        }
        catch (ApiException ex) when (ex.StatusCode == 429)
        {
            throw new RenderQueueFullException(ReadRetryAfter(ex), ex);
        }
    }

    /// <summary>Render from an Excel template. Returns the file link (200) or, with "async": true (Pro), the queued job (202).</summary>
    public async Task<RenderOutcome<ExportExcelUrlResponse>> RenderExcelAsync(ExcelFromTemplateRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            return new(await PostRenderExcelTemplateAsync(request, cancellationToken).ConfigureAwait(false), null);
        }
        catch (ApiException<ExportPdfAsyncResponse> queued) when (queued.StatusCode == 202)
        {
            return new(null, queued.Result);
        }
        catch (ApiException ex) when (ex.StatusCode == 429)
        {
            throw new RenderQueueFullException(ReadRetryAfter(ex), ex);
        }
    }

    /// <summary>GET /render/jobs/{jobId}.</summary>
    public async Task<RenderJobStatus> GetRenderJobAsync(Guid jobId, CancellationToken cancellationToken = default)
    {
        var url = $"{BaseUrl?.TrimEnd('/')}/render/jobs/{jobId}";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        PrepareRequest(_httpClient, request, url);
        using var response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        var body = response.Content == null ? string.Empty : await response.Content.ReadAsStringAsync().ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
            throw new ApiException($"Could not read render job {jobId}.", (int)response.StatusCode, body,
                response.Headers.ToDictionary(h => h.Key, h => h.Value), null);
        return Newtonsoft.Json.JsonConvert.DeserializeObject<RenderJobStatus>(body, JsonSerializerSettings)
            ?? throw new ApiException("Empty job response.", (int)response.StatusCode, body, response.Headers.ToDictionary(h => h.Key, h => h.Value), null);
    }

    /// <summary>
    /// Polls a job until it finishes. Returns the job with a fresh <see cref="RenderJobStatus.DownloadUrl"/> on success;
    /// throws <see cref="RenderJobFailedException"/> on failure and <see cref="TimeoutException"/> after <paramref name="timeout"/>.
    /// </summary>
    public async Task<RenderJobStatus> WaitForJobAsync(Guid jobId, TimeSpan? pollInterval = null, TimeSpan? timeout = null, CancellationToken cancellationToken = default)
    {
        var interval = pollInterval ?? TimeSpan.FromSeconds(2);
        var deadline = DateTimeOffset.UtcNow + (timeout ?? TimeSpan.FromMinutes(10));
        while (true)
        {
            var job = await GetRenderJobAsync(jobId, cancellationToken).ConfigureAwait(false);
            if (job.Status == "success") return job;
            if (job.Status == "failed") throw new RenderJobFailedException(job);
            if (DateTimeOffset.UtcNow + interval > deadline)
                throw new TimeoutException($"Render job {jobId} did not finish in time (last status: {job.Status}).");
            await Task.Delay(interval, cancellationToken).ConfigureAwait(false);
        }
    }

    private static TimeSpan? ReadRetryAfter(ApiException ex)
    {
        if (ex.Headers == null) return null;
        foreach (var header in ex.Headers)
        {
            if (!header.Key.Equals("Retry-After", StringComparison.OrdinalIgnoreCase)) continue;
            var value = header.Value?.FirstOrDefault();
            if (int.TryParse(value, out var seconds)) return TimeSpan.FromSeconds(seconds);
        }
        return null;
    }
}
