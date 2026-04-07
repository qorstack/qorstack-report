using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Users.Queries.GetApiKeysByUserId;

/// <summary>
/// Handler for GetApiKeysByUserIdQuery
/// </summary>
public class GetApiKeysByUserIdQueryHandler : IRequestHandler<GetApiKeysByUserIdQuery, List<ApiKeyDto>>
{
    private readonly IApplicationDbContext _context;

    public GetApiKeysByUserIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ApiKeyDto>> Handle(GetApiKeysByUserIdQuery request, CancellationToken cancellationToken)
    {
        var apiKeys = await _context.ApiKeys
            .Where(a => a.UserId == request.UserId)
            .OrderByDescending(a => a.CreatedDatetime)
            .Select(a => new ApiKeyDto
            {
                Id = a.Id,
                UserId = a.UserId,
                Name = a.Name,
                // Mask the API key for security - only show prefix
                XApiKey = a.XApiKey.Length > 10
                    ? a.XApiKey.Substring(0, 10) + "***"
                    : "***",
                IsActive = a.IsActive,
                CreatedBy = a.CreatedBy,
                CreatedDatetime = a.CreatedDatetime,
                UpdatedBy = a.UpdatedBy,
                UpdatedDatetime = a.UpdatedDatetime
            })
            .ToListAsync(cancellationToken);

        return apiKeys;
    }
}
