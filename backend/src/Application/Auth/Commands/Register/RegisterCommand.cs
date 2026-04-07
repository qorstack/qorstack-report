using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Auth.Common;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

using QorstackReportService.Application.Auth.Models;

namespace QorstackReportService.Application.Auth.Commands.Register;

public record RegisterCommand(string Email, string Password, string FirstName, string LastName) : IRequest<RegisterResponse>;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, RegisterResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly IOtpService _otpService;
    private readonly PasswordHasherService _passwordHasher;
    private readonly ILogger<RegisterCommandHandler> _logger;

    public RegisterCommandHandler(
        IApplicationDbContext context,
        IOtpService otpService,
        PasswordHasherService passwordHasher,
        ILogger<RegisterCommandHandler> logger)
    {
        _context = context;
        _otpService = otpService;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task<RegisterResponse> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("=== REGISTRATION START ===");

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

            if (user != null)
            {
                if (user.Status != "pending_verification")
                {
                    throw new ValidationException("USER_ALREADY_EXISTS", $"User with email {request.Email} already exists.");
                }

                _logger.LogInformation("Existing pending user found. Updating info for re-registration.");

                user.FirstName = request.FirstName;
                user.LastName = request.LastName;
                user.UpdatedDatetime = DateTime.UtcNow;
                user.UpdatedBy = "system_register";
            }
            else
            {
                _logger.LogInformation("Creating new user entity.");
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = request.Email,
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Status = "pending_verification",
                    CreatedDatetime = DateTime.UtcNow,
                    CreditBalance = 0
                };

                _context.Users.Add(user);
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
            await _context.SaveChangesAsync(cancellationToken);

            var refCode = await _otpService.GenerateOtp(request.Email, "REGISTER", cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("=== REGISTRATION SUCCESS for {Email} ===", request.Email);

            return new RegisterResponse(
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.Status,
                refCode
            );
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception($"Registration failed for {request.Email}. See logs for details."), _logger);
        }
    }
}
