using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Auth.Models;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Auth.Commands.GoogleLogin;

public record GoogleLoginCommand(string GoogleId, string Email, string FirstName, string LastName, string PhotoUrl) : IRequest<AuthResponse>;

public class GoogleLoginCommandHandler : IRequestHandler<GoogleLoginCommand, AuthResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleLoginCommandHandler> _logger;

    public GoogleLoginCommandHandler(
        IApplicationDbContext context,
        IJwtTokenGenerator jwtTokenGenerator,
        IConfiguration configuration,
        ILogger<GoogleLoginCommandHandler> logger)
    {
        _context = context;
        _jwtTokenGenerator = jwtTokenGenerator;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponse> Handle(GoogleLoginCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Google login for {Email}", request.Email);

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(
                u => u.GoogleId == request.GoogleId || u.Email == request.Email, cancellationToken);

            if (user == null)
            {
                // Create new Google User
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = request.Email,
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    GoogleId = request.GoogleId,
                    ProfileImageUrl = request.PhotoUrl,
                    Status = "active",
                    CreatedDatetime = DateTime.UtcNow,
                    CreditBalance = 0
                };
                _context.Users.Add(user);
            }
            else if (user.GoogleId == null)
            {
                // Link existing user to Google
                user.GoogleId = request.GoogleId;
                user.ProfileImageUrl = request.PhotoUrl ?? user.ProfileImageUrl;
            }

            // Generate tokens
            var accessToken = _jwtTokenGenerator.GenerateAccessToken(user);
            var refreshToken = _jwtTokenGenerator.GenerateRefreshToken();

            var refreshTokenExpiryDays = double.Parse(
                _configuration["Jwt:RefreshTokenExpiryDays"] ?? "7",
                System.Globalization.CultureInfo.InvariantCulture);

            var rtEntity = new Domain.Entities.RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiryDays),
                CreatedDatetime = DateTime.UtcNow,
                CreatedBy = "System"
            };

            _context.RefreshTokens.Add(rtEntity);
            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("Google login successful for {Email}", request.Email);
            return new AuthResponse(accessToken, refreshToken);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception($"Google login failed for {request.Email}."), _logger);
        }
    }
}
