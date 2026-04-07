using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Reports.Queries.GetReportJobById;

/// <summary>
/// Handler for GetReportJobByIdQuery
/// </summary>
public class GetReportJobByIdQueryHandler : IRequestHandler<GetReportJobByIdQuery, ReportJobDto>
{
    private readonly IApplicationDbContext _context;

    public GetReportJobByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReportJobDto> Handle(GetReportJobByIdQuery request, CancellationToken cancellationToken)
    {
        var job = await _context.ReportJobs
            .Where(r => r.Id == request.Id && r.UserId == request.UserId)
            .Select(r => new ReportJobDto
            {
                Id = r.Id,
                UserId = r.UserId,
                SourceType = r.SourceType,
                TemplateVersionId = r.TemplateVersionId,
                Status = r.Status,
                RequestData = r.RequestData,
                ErrorMessage = r.ErrorMessage,
                OutputFilePath = r.OutputFilePath,
                StartedAt = r.StartedAt,
                FinishedAt = r.FinishedAt,
                DurationMs = r.DurationMs,
                CreatedBy = r.CreatedBy,
                CreatedDatetime = r.CreatedDatetime,
                UpdatedBy = r.UpdatedBy,
                UpdatedDatetime = r.UpdatedDatetime
            })
            .FirstOrDefaultAsync(cancellationToken);

        return job ?? throw new NotFoundException("ReportJob", request.Id);
    }
}
