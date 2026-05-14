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
    private readonly PasswordHasherService _passwordHasher;
    private readonly ILogger<RegisterCommandHandler> _logger;

    public RegisterCommandHandler(
        IApplicationDbContext context,
        PasswordHasherService passwordHasher,
        ILogger<RegisterCommandHandler> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task<RegisterResponse> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("=== REGISTRATION START ===");

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var existing = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);
            if (existing != null)
            {
                throw new ValidationException("USER_ALREADY_EXISTS", $"User with email {request.Email} already exists.");
            }

            _logger.LogInformation("Creating new user entity.");
            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = request.Email,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Status = "active",
                CreatedDatetime = DateTime.UtcNow
            };

            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);

            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("=== REGISTRATION SUCCESS for {Email} ===", request.Email);

            return new RegisterResponse(
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.Status
            );
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception($"Registration failed for {request.Email}. See logs for details."), _logger);
        }
    }
}
