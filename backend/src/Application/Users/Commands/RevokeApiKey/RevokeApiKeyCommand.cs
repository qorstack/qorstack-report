namespace QorstackReportService.Application.Users.Commands.RevokeApiKey;

/// <summary>
/// Command to revoke an API key
/// </summary>
public class RevokeApiKeyCommand : IRequest<Unit>
{
    /// <summary>
    /// API key ID to revoke
    /// </summary>
    public Guid Id { get; set; }
}
