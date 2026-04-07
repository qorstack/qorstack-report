using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Auth.Models;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Auth.Commands.GitlabLogin;

public record GitlabLoginCommand(string GitlabId, string Email, string Name, string AvatarUrl) : IRequest<AuthResponse>;

public class GitlabLoginCommandHandler : IRequestHandler<GitlabLoginCommand, AuthResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GitlabLoginCommandHandler> _logger;

    public GitlabLoginCommandHandler(
        IApplicationDbContext context,
        IJwtTokenGenerator jwtTokenGenerator,
        IConfiguration configuration,
        ILogger<GitlabLoginCommandHandler> logger)
    {
        _context = context;
        _jwtTokenGenerator = jwtTokenGenerator;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponse> Handle(GitlabLoginCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Gitlab login for {Email}", request.Email);

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(
                u => u.GitlabId == request.GitlabId || u.Email == request.Email, cancellationToken);

            if (user == null)
            {
                var names = request.Name?.Split(' ', 2) ?? new[] { "Gitlab", "User" };
                var firstName = names.Length > 0 ? names[0] : "Gitlab";
                var lastName = names.Length > 1 ? names[1] : "User";

                // Create new Gitlab User
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = request.Email,
                    FirstName = firstName,
                    LastName = lastName,
                    GitlabId = request.GitlabId,
                    ProfileImageUrl = request.AvatarUrl,
                    Status = "active",
                    CreatedDatetime = DateTime.UtcNow,
                    CreditBalance = 0
                };
                _context.Users.Add(user);
            }
            else if (user.GitlabId == null)
            {
                // Link existing user to Gitlab
                user.GitlabId = request.GitlabId;
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

            _logger.LogInformation("Gitlab login successful for {Email}", request.Email);
            return new AuthResponse(accessToken, refreshToken);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Gitlab login failed for {Email}", request.Email);
            throw;
        }
    }
}
