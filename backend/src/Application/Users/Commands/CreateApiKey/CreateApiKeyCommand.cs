namespace QorstackReportService.Application.Users.Commands.CreateApiKey;

/// <summary>
/// Command to create a new API key for a user
/// </summary>
public class CreateApiKeyCommand : IRequest<CreateApiKeyResult>
{
    /// <summary>
    /// User ID
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// API key name
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Daily quota (null for unlimited)
    /// </summary>
    public int? QuotaPerDay { get; set; }
}

/// <summary>
/// Result of API key creation
/// </summary>
public class CreateApiKeyResult
{
    /// <summary>
    /// API key ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The generated API key (only shown once)
    /// </summary>
    public required string ApiKey { get; set; }
}
