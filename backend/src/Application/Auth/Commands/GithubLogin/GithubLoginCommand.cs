using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Auth.Models;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Auth.Commands.GithubLogin;

public record GithubLoginCommand(string GithubId, string Email, string Name, string AvatarUrl) : IRequest<AuthResponse>;

public class GithubLoginCommandHandler : IRequestHandler<GithubLoginCommand, AuthResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GithubLoginCommandHandler> _logger;

    public GithubLoginCommandHandler(
        IApplicationDbContext context,
        IJwtTokenGenerator jwtTokenGenerator,
        IConfiguration configuration,
        ILogger<GithubLoginCommandHandler> logger)
    {
        _context = context;
        _jwtTokenGenerator = jwtTokenGenerator;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponse> Handle(GithubLoginCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Github login for {Email}", request.Email);

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(
                u => u.GithubId == request.GithubId || u.Email == request.Email, cancellationToken);

            if (user == null)
            {
                var names = request.Name?.Split(' ', 2) ?? new[] { "Github", "User" };
                var firstName = names.Length > 0 ? names[0] : "Github";
                var lastName = names.Length > 1 ? names[1] : "User";

                // Create new Github User
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = request.Email,
                    FirstName = firstName,
                    LastName = lastName,
                    GithubId = request.GithubId,
                    ProfileImageUrl = request.AvatarUrl,
                    Status = "active",
                    CreatedDatetime = DateTime.UtcNow,
                    CreditBalance = 0
                };
                _context.Users.Add(user);
            }
            else if (user.GithubId == null)
            {
                // Link existing user to Github
                user.GithubId = request.GithubId;
                user.ProfileImageUrl = request.AvatarUrl ?? user.ProfileImageUrl;
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

            _logger.LogInformation("Github login successful for {Email}", request.Email);
            return new AuthResponse(accessToken, refreshToken);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Github login failed for {Email}", request.Email);
            throw;
        }
    }
}
