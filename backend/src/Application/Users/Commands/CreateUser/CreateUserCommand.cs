namespace QorstackReportService.Application.Users.Commands.CreateUser;

/// <summary>
/// Command to create a new user
/// </summary>
public class CreateUserCommand : IRequest<Guid>
{
    /// <summary>
    /// User email
    /// </summary>
    public required string Email { get; set; }

    /// <summary>
    /// User password (will be hashed)
    /// </summary>
    public required string Password { get; set; }

    /// <summary>
    /// First name
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// Last name
    /// </summary>
    public string? LastName { get; set; }

    /// <summary>
    /// User status
    /// </summary>
    public string Status { get; set; } = "active";
}
