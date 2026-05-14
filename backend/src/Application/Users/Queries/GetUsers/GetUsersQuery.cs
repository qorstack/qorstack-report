using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Users.Queries.GetUsers;

/// <summary>
/// Query to get users with pagination
/// </summary>
public class GetUsersQuery : IRequest<PaginatedList<UserDto>>
{
    /// <summary>
    /// Filter by status (optional)
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// Search by email (optional)
    /// </summary>
    public string? SearchEmail { get; set; }

    /// <summary>
    /// Page number (1-based)
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// Page size
    /// </summary>
    public int PageSize { get; set; } = 10;
}
