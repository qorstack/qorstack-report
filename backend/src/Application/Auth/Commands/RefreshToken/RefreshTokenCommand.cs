using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Auth.Models;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Auth.Commands.RefreshToken;

public record RefreshTokenCommand(string AccessToken, string RefreshToken) : IRequest<AuthResponse>;

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RefreshTokenCommandHandler> _logger;

    public RefreshTokenCommandHandler(
        IApplicationDbContext context,
        IJwtTokenGenerator jwtTokenGenerator,
        IConfiguration configuration,
        ILogger<RefreshTokenCommandHandler> logger)
    {
        _context = context;
        _jwtTokenGenerator = jwtTokenGenerator;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponse> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Refresh token request");

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var storedToken = await _context.RefreshTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken, cancellationToken);

            if (storedToken == null || storedToken.ExpiresAt < DateTime.UtcNow || storedToken.RevokedAt != null)
            {
                throw new UnauthorizedAccessException("Invalid or expired refresh token");
            }

            var user = storedToken.User;
            if (user == null)
            {
                throw new KeyNotFoundException("User not found");
            }

            // Revoke old token
            storedToken.RevokedAt = DateTime.UtcNow;
            _context.RefreshTokens.Update(storedToken);

            // Generate new tokens
            var accessToken = _jwtTokenGenerator.GenerateAccessToken(user);
            var newRefreshToken = _jwtTokenGenerator.GenerateRefreshToken();

            var refreshTokenExpiryDays = double.Parse(
                _configuration["Jwt:RefreshTokenExpiryDays"] ?? "7",
                System.Globalization.CultureInfo.InvariantCulture);

            var rtEntity = new Domain.Entities.RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiryDays),
                CreatedDatetime = DateTime.UtcNow,
                CreatedBy = "System"
            };

            _context.RefreshTokens.Add(rtEntity);
            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("Token refreshed for user {UserId}", user.Id);
            return new AuthResponse(accessToken, newRefreshToken);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception("Failed to refresh token."), _logger);
        }
    }
}
