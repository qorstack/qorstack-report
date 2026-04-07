using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Users.Queries.GetUserById;

/// <summary>
/// Handler for GetUserByIdQuery
/// </summary>
public class GetUserByIdQueryHandler : IRequestHandler<GetUserByIdQuery, UserDto>
{
    private readonly IApplicationDbContext _context;

    public GetUserByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserDto> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Where(u => u.Id == request.Id)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Email = u.Email,
                PasswordHash = "***", // Don't expose password hash
                FirstName = u.FirstName,
                LastName = u.LastName,
                CreditBalance = u.CreditBalance,
                Status = u.Status,
                CreatedBy = u.CreatedBy,
                CreatedDatetime = u.CreatedDatetime,
                UpdatedBy = u.UpdatedBy,
                UpdatedDatetime = u.UpdatedDatetime
            })
            .FirstOrDefaultAsync(cancellationToken);

        return user ?? throw new NotFoundException("User", request.Id);
    }
}
