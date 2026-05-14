using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Settings.Commands.UpdateProfile;

public record UpdateProfileCommand(string? FirstName, string? LastName, string? ProfileImageUrl) : IRequest<Unit>;

public class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public UpdateProfileCommandHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null) throw new UnauthorizedAccessException();
        var userId = Guid.Parse(userIdStr);

        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null) throw new UnauthorizedAccessException();

        user.FirstName = request.FirstName ?? user.FirstName;
        user.LastName = request.LastName ?? user.LastName;
        user.ProfileImageUrl = request.ProfileImageUrl ?? user.ProfileImageUrl;
        user.UpdatedDatetime = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
