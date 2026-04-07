using MediatR;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Auth.Common;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Auth.Commands.ChangePassword;

public record ChangePasswordCommand(string UserId, string OldPassword, string NewPassword) : IRequest<Unit>;

public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly PasswordHasherService _passwordHasher;
    private readonly ILogger<ChangePasswordCommandHandler> _logger;

    public ChangePasswordCommandHandler(
        IApplicationDbContext context,
        PasswordHasherService passwordHasher,
        ILogger<ChangePasswordCommandHandler> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task<Unit> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Change password request for user {UserId}", request.UserId);

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            if (!Guid.TryParse(request.UserId, out var uid))
            {
                throw new ArgumentException("Invalid User Id");
            }

            var user = await _context.Users.FindAsync(new object[] { uid }, cancellationToken);
            if (user == null)
            {
                throw new KeyNotFoundException("User not found");
            }

            if (!string.IsNullOrEmpty(user.PasswordHash))
            {
                if (!_passwordHasher.VerifyPassword(user, user.PasswordHash, request.OldPassword))
                {
                    throw new ValidationException("Invalid old password");
                }
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("Password changed successfully for user {UserId}", request.UserId);
            return Unit.Value;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception("Failed to change password."), _logger);
        }
    }
}
