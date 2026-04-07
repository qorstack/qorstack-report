using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Settings.Models;

namespace QorstackReportService.Application.Settings.Queries.GetProfile;

public record GetProfileQuery : IRequest<ProfileDto>;

public class GetProfileQueryHandler : IRequestHandler<GetProfileQuery, ProfileDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public GetProfileQueryHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<ProfileDto> Handle(GetProfileQuery request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null) throw new UnauthorizedAccessException();
        var userId = Guid.Parse(userIdStr);

        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null) throw new UnauthorizedAccessException();

        return new ProfileDto(user.Id, user.Email, user.FirstName, user.LastName, user.ProfileImageUrl, user.CreditBalance);
    }
}
