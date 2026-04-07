using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Users.Commands.CreateUser;

/// <summary>
/// Handler for CreateUserCommand
/// </summary>
public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;
    private readonly ILogger<CreateUserCommandHandler> _logger;

    public CreateUserCommandHandler(IApplicationDbContext context, IUser currentUser, ILogger<CreateUserCommandHandler> logger)
    {
        _context = context;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<Guid> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            // Check if email already exists
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

            if (existingUser != null)
            {
                throw new ValidationException("Email already exists");
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = request.Email,
                PasswordHash = HashPassword(request.Password),
                FirstName = request.FirstName,
                LastName = request.LastName,
                Status = request.Status.ToLowerInvariant(),
                CreatedBy = _currentUser.Id ?? "System",
                CreatedDatetime = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);

            var defaultPlan = await _context.Plans
                .Where(p => p.IsActive == true && p.DisplayOrder != null)
                .OrderBy(p => p.DisplayOrder)
                .FirstOrDefaultAsync(cancellationToken);

            if (defaultPlan != null)
            {
                var subscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    PlanId = defaultPlan.Id,
                    Status = "active",
                    CurrentPeriodStart = DateTime.UtcNow,
                    CurrentPeriodEnd = DateTime.UtcNow.AddYears(100), // Default to long duration for free/default plan
                    CreatedBy = _currentUser.Id ?? "System",
                    CreatedDatetime = DateTime.UtcNow
                };
                _context.Subscriptions.Add(subscription);
                await _context.SaveChangesAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);

            return user.Id;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception("Failed to create user."), _logger);
        }
    }

    private static string HashPassword(string password)
    {
        // Use BCrypt or similar in production
        // For now, using simple SHA256 hash
        using var sha256 = SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(password);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
}
