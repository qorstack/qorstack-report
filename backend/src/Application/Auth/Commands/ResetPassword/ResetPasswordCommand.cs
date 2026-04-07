using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Auth.Common;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Auth.Commands.ResetPassword;

public record ResetPasswordCommand(string VerificationToken, string NewPassword) : IRequest<Unit>;

public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly IOtpService _otpService;
    private readonly PasswordHasherService _passwordHasher;
    private readonly ILogger<ResetPasswordCommandHandler> _logger;

    public ResetPasswordCommandHandler(
        IApplicationDbContext context,
        IOtpService otpService,
        PasswordHasherService passwordHasher,
        ILogger<ResetPasswordCommandHandler> logger)
    {
        _context = context;
        _otpService = otpService;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task<Unit> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Reset password request with token");

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var verification = await _context.OtpVerifications.FirstOrDefaultAsync(v => v.VerificationToken == request.VerificationToken && v.Type == "FORGOT_PASSWORD", cancellationToken);

            if (verification == null || verification.IsVerified != true || verification.IsConsumed == true)
            {
               throw new ValidationException("INVALID_TOKEN", "Verification token is invalid or has already been used");
            }

            verification.IsConsumed = true;

            var user = await _context.Users.FirstAsync(u => u.Email == verification.Email, cancellationToken);
            user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);

            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("Password reset successful for {Email}", verification.Email);
            return Unit.Value;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception($"Failed to reset password."), _logger);
        }
    }
}
