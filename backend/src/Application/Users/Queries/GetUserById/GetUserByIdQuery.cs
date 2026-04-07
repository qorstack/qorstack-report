using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Users.Queries.GetUserById;

/// <summary>
/// Query to get a user by ID
/// </summary>
public class GetUserByIdQuery : IRequest<UserDto>
{
    /// <summary>
    /// User ID
    /// </summary>
    public Guid Id { get; set; }
}
