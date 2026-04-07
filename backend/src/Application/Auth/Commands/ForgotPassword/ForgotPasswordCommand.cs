using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Auth.Models;

namespace QorstackReportService.Application.Auth.Commands.ForgotPassword;

public record ForgotPasswordCommand(string Email) : IRequest<ForgotPasswordResponse?>;

public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, ForgotPasswordResponse?>
{
    private readonly IApplicationDbContext _context;
    private readonly IOtpService _otpService;
    private readonly ILogger<ForgotPasswordCommandHandler> _logger;

    public ForgotPasswordCommandHandler(
        IApplicationDbContext context,
        IOtpService otpService,
        ILogger<ForgotPasswordCommandHandler> logger)
    {
        _context = context;
        _otpService = otpService;
        _logger = logger;
    }

    public async Task<ForgotPasswordResponse?> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Forgot password request for {Email}", request.Email);

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);
            if (user == null)
            {
                await tx.CommitAsync(cancellationToken);
                return null;
            }

            var refCode = await _otpService.GenerateOtp(request.Email, "FORGOT_PASSWORD", cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("Forgot password OTP sent for {Email}", request.Email);
            return new ForgotPasswordResponse(refCode);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception($"Failed to initiate forgot password for {request.Email}."), _logger);
        }
    }
}
