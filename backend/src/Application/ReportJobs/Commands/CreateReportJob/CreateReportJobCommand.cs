using System.Text.Json;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.ReportJobs.Commands.CreateReportJob;

/// <summary>
/// Command to create a new report job.
/// </summary>
public class CreateReportJobCommand : IRequest<CreateReportJobResponse>
{
    /// <summary>
    /// Template key to use for report generation.
    /// </summary>
    public string TemplateKey { get; set; } = null!;

    /// <summary>
    /// JSON data for report generation.
    /// </summary>
    public JsonDocument RequestData { get; set; } = null!;
}

/// <summary>
/// Response for report job creation.
/// </summary>
public class CreateReportJobResponse
{
    /// <summary>
    /// Report job ID.
    /// </summary>
    public Guid JobId { get; set; }

    /// <summary>
    /// Job status.
    /// </summary>
    public string Status { get; set; } = null!;
}

/// <summary>
/// Handler for CreateReportJobCommand.
/// </summary>
public class CreateReportJobCommandHandler : IRequestHandler<CreateReportJobCommand, CreateReportJobResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;
    private readonly IReportJobQuotaService _quotaService;

    public CreateReportJobCommandHandler(
        IApplicationDbContext context,
        IUser user,
        IReportJobQuotaService quotaService)
    {
        _context = context;
        _user = user;
        _quotaService = quotaService;
    }

    public async Task<CreateReportJobResponse> Handle(CreateReportJobCommand request, CancellationToken cancellationToken)
    {
        var userIdString = _user.Id ?? throw new InvalidOperationException("User ID is required");
        var userId = Guid.Parse(userIdString);
        var jobId = Guid.NewGuid();

        // Validate user exists
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
            throw new NotFoundException("User", userId);

        // Find the latest active template version for the given template key
        var templateVersion = await _context.TemplateVersions
            .Include(tv => tv.Template)
            .Where(tv => tv.Template.TemplateKey == request.TemplateKey &&
                        tv.Status == "active" &&
                        tv.Template.UserId == userId)
            .OrderByDescending(tv => tv.CreatedDatetime)
            .FirstOrDefaultAsync(cancellationToken);

        if (templateVersion == null)
            throw new NotFoundException($"Active template version for key '{request.TemplateKey}'");

        // Authorize and charge quota (OSS: always free; SaaS: subscription/credit logic)
        var chargedType = await _quotaService.AuthorizeAndChargeAsync(userId, jobId, cancellationToken);

        if (chargedType == null)
            throw new QuotaExceededException("No available quota. Please purchase a subscription or add credits.");

#nullable disable
        string serializedRequestData = JsonSerializer.Serialize(request.RequestData);
#nullable restore

        var reportJob = new ReportJob
        {
            Id = jobId,
            UserId = userId,
            TemplateVersionId = templateVersion.Id,
            Status = "pending",
            RequestData = serializedRequestData,
            CreatedBy = userId.ToString(),
            CreatedDatetime = DateTime.UtcNow,
            UpdatedBy = userId.ToString(),
            UpdatedDatetime = DateTime.UtcNow
        };

        _context.ReportJobs.Add(reportJob);
        await _context.SaveChangesAsync(cancellationToken);

        return new CreateReportJobResponse
        {
            JobId = jobId,
            Status = "pending"
        };
    }
}
