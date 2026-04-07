using MediatR;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Auth.Models;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Exceptions;

namespace QorstackReportService.Application.Auth.Commands.VerifyOtp;

public record VerifyOtpCommand(string Email, string Otp, string Type) : IRequest<VerifyOtpResponse>;

public class VerifyOtpCommandHandler : IRequestHandler<VerifyOtpCommand, VerifyOtpResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly IOtpService _otpService;
    private readonly ILogger<VerifyOtpCommandHandler> _logger;

    public VerifyOtpCommandHandler(
        IApplicationDbContext context,
        IOtpService otpService,
        ILogger<VerifyOtpCommandHandler> logger)
    {
        _context = context;
        _otpService = otpService;
        _logger = logger;
    }

    public async Task<VerifyOtpResponse> Handle(VerifyOtpCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Verify OTP request for {Email}, type: {Type}", request.Email, request.Type);

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var token = await _otpService.VerifyOtp(request.Email, request.Otp, request.Type, cancellationToken);
            if (token == null)
            {
                throw new ValidationException("INVALID_OTP", "Invalid OTP code");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);
            if (user != null && user.Status == "pending_verification")
            {
                user.Status = "active";
                _logger.LogInformation("User {Email} status updated to active", request.Email);
            }

            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("OTP verified for {Email}", request.Email);
            return new VerifyOtpResponse(token);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception($"Failed to verify OTP for {request.Email}."), _logger);
        }
    }
}
