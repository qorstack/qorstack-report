using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Users.Queries.GetApiKeysByUserId;

/// <summary>
/// Query to get API keys for a user
/// </summary>
public class GetApiKeysByUserIdQuery : IRequest<List<ApiKeyDto>>
{
    /// <summary>
    /// User ID
    /// </summary>
    public Guid UserId { get; set; }
}
