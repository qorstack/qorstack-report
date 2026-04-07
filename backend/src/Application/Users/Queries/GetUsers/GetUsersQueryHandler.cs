using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Users.Queries.GetUsers;

/// <summary>
/// Handler for GetUsersQuery
/// </summary>
public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, PaginatedList<UserDto>>
{
    private readonly IApplicationDbContext _context;

    public GetUsersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<UserDto>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Users.AsQueryable();

        // Apply filters
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(u => u.Status == request.Status.ToLowerInvariant());
        }

        if (!string.IsNullOrWhiteSpace(request.SearchEmail))
        {
            query = query.Where(u => u.Email.Contains(request.SearchEmail));
        }

        // Order by created date descending
        query = query.OrderByDescending(u => u.CreatedDatetime);

        // Get total count
        var totalCount = await query.CountAsync(cancellationToken);

        // Apply pagination and projection
        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Email = u.Email,
                PasswordHash = "***", // Don't expose password hash
                FirstName = u.FirstName,
                LastName = u.LastName,
                CreditBalance = 0, // TODO: Calculate actual credit balance
                Status = u.Status,
                CreatedBy = u.CreatedBy,
                CreatedDatetime = u.CreatedDatetime,
                UpdatedBy = u.UpdatedBy,
                UpdatedDatetime = u.UpdatedDatetime
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<UserDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}
