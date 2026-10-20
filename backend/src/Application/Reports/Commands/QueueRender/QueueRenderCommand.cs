using Microsoft.Extensions.Configuration;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Reports.Models;
using QorstackReportService.Domain.Entities;
using QorstackReportService.Domain.Enums;

namespace QorstackReportService.Application.Reports.Commands.QueueRender;

/// <summary>
/// Pro: queues a render instead of running it in the request. Checks the license and that the template
/// (and requested version) exist, stores the job with its payload in <c>report_jobs</c> — always, even when
/// the project has logging off — and wakes the workers. Returns 202 data.
/// </summary>
public class QueueRenderCommand : IRequest<ExportPdfAsyncResponse>
{
    public required IRenderJobCommand Render { get; init; }
    public string? WebhookUrl { get; init; }
}

public class QueueRenderCommandHandler : IRequestHandler<QueueRenderCommand, ExportPdfAsyncResponse>
{
    public const int DefaultMaxPendingJobsPerUser = 100;

    private readonly IFeatureFlagService _features;
    private readonly IApplicationDbContext _context;
    private readonly IAsyncRenderQueue _queue;
    private readonly ISandboxAssetService _assets;
    private readonly IUser _user;
    private readonly int _maxPendingPerUser;

    public QueueRenderCommandHandler(
        IFeatureFlagService features,
        IApplicationDbContext context,
        IAsyncRenderQueue queue,
        ISandboxAssetService assets,
        IUser user,
        IConfiguration configuration)
    {
        _features = features;
        _context = context;
        _queue = queue;
        _assets = assets;
        _user = user;
        _maxPendingPerUser = Math.Max(1, configuration.GetValue("Render:MaxPendingJobsPerUser", DefaultMaxPendingJobsPerUser));
    }

    public async Task<ExportPdfAsyncResponse> Handle(QueueRenderCommand request, CancellationToken cancellationToken)
    {
        if (!_features.AsyncRender)
            throw new ProFeatureRequiredException("Async rendering");

        var render = request.Render;
        var template = await _context.Templates
            .Include(t => t.TemplateVersions)
            .FirstOrDefaultAsync(t => t.TemplateKey == render.TemplateKey && t.UserId == render.UserId, cancellationToken)
            ?? throw new KeyNotFoundException($"Template {render.TemplateKey} not found.");

        var version = render.TemplateVersion == null
            ? template.TemplateVersions.FirstOrDefault(v => v.Status == "active")
            : template.TemplateVersions.FirstOrDefault(v => v.Version == render.TemplateVersion);
        if (version == null)
        {
            if (render.TemplateVersion != null)
                throw new KeyNotFoundException($"Template '{render.TemplateKey}' has no version {render.TemplateVersion}.");
            throw new InvalidOperationException("No active template version found");
        }

        var pending = ReportJobStatus.Pending.ToString().ToLowerInvariant();
        var processing = ReportJobStatus.Processing.ToString().ToLowerInvariant();
        var queued = await _context.ReportJobs.CountAsync(
            j => j.UserId == render.UserId && j.Payload != null && (j.Status == pending || j.Status == processing),
            cancellationToken);
        if (queued >= _maxPendingPerUser)
            throw new RenderQueueFullException(_maxPendingPerUser);

        var jobId = Guid.NewGuid();
        render.JobId = jobId;

        // Keep queue rows small: base64 images / QR logos go to storage now, the payload keeps minio: paths.
        // Same checks as the synchronous path, so the job cannot fail later for a reason we can report now.
        var data = render.Data ?? new DocumentProcessingData();
        _assets.ConvertPresignedUrlsToMinioPaths(data);
        await _assets.ReplaceBase64WithMinioUrlsAsync(data, AssetPrefix(render.UserId, template.Id, jobId));

        var now = DateTime.UtcNow;
        var job = new ReportJob
        {
            Id = jobId,
            UserId = render.UserId,
            SourceType = render.SourceType,
            TemplateVersionId = version.Id,
            Status = pending,
            Payload = RenderJobPayload.Serialize(render),
            WebhookUrl = request.WebhookUrl,
            AvailableAt = now,
            CreatedBy = _user.Id ?? "unknown",
            CreatedDatetime = now,
            UpdatedBy = _user.Id ?? "unknown",
            UpdatedDatetime = now
        };
        _context.ReportJobs.Add(job);
        await _context.SaveChangesAsync(cancellationToken);
        await _queue.NotifyAsync(cancellationToken);

        return new ExportPdfAsyncResponse
        {
            JobId = job.Id,
            Status = job.Status,
            StatusUrl = $"/render/jobs/{job.Id}"
        };
    }

    /// <summary>
    /// Storage prefix for images uploaded with an async job. Lives under the template's builder assets
    /// (so the ownership check accepts it) but in its own folder, so it never overwrites the builder's
    /// images and can be deleted when the job finishes.
    /// </summary>
    public static string AssetPrefix(Guid userId, Guid templateId, Guid jobId) =>
        $"sandbox-assets/{userId}/{templateId}/async/{jobId}";
}
