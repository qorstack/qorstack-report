using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Users.Commands.CreateApiKey;

/// <summary>
/// Handler for CreateApiKeyCommand
/// </summary>
public class CreateApiKeyCommandHandler : IRequestHandler<CreateApiKeyCommand, CreateApiKeyResult>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;
    private readonly ILogger<CreateApiKeyCommandHandler> _logger;

    public CreateApiKeyCommandHandler(IApplicationDbContext context, IUser currentUser, ILogger<CreateApiKeyCommandHandler> logger)
    {
        _context = context;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<CreateApiKeyResult> Handle(CreateApiKeyCommand request, CancellationToken cancellationToken)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Verify user exists
            var userExists = await _context.Users
                .AnyAsync(u => u.Id == request.UserId, cancellationToken);

            if (!userExists)
            {
                throw new KeyNotFoundException($"User {request.UserId} not found.");
            }

            // Generate secure API key
            var apiKey = GenerateApiKey();

            var entity = new ApiKey
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId,
                Name = request.Name,
                XApiKey = apiKey,
                IsActive = true,
                CreatedBy = _currentUser.Id,
                CreatedDatetime = DateTime.UtcNow
            };

            _context.ApiKeys.Add(entity);
            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return new CreateApiKeyResult
            {
                Id = entity.Id,
                ApiKey = apiKey
            };
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception($"Failed to create API key for user {request.UserId}."), _logger);
        }
    }

    private static string GenerateApiKey()
    {
        // Generate a secure random API key: rdx_{random_bytes_base64}
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        var base64 = Convert.ToBase64String(bytes)
            .Replace("+", "")
            .Replace("/", "")
            .Replace("=", "");
        return $"rdx_{base64}";
    }
}
