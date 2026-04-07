using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Auth.Common;
using QorstackReportService.Application.Auth.Models;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Auth.Commands.Login;

public record LoginCommand(string Email, string Password) : IRequest<AuthResponse>;

public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly PasswordHasherService _passwordHasher;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LoginCommandHandler> _logger;

    public LoginCommandHandler(
        IApplicationDbContext context,
        IJwtTokenGenerator jwtTokenGenerator,
        PasswordHasherService passwordHasher,
        IConfiguration configuration,
        ILogger<LoginCommandHandler> logger)
    {
        _context = context;
        _jwtTokenGenerator = jwtTokenGenerator;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Login attempt for {Email}", request.Email);

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

            if (user == null || string.IsNullOrEmpty(user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid credentials");
            }

            if (!_passwordHasher.VerifyPassword(user, user.PasswordHash, request.Password))
            {
                throw new UnauthorizedAccessException("Invalid credentials");
            }

            // Generate tokens
            var accessToken = _jwtTokenGenerator.GenerateAccessToken(user);
            var refreshToken = _jwtTokenGenerator.GenerateRefreshToken();

            // Store refresh token
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

            _logger.LogInformation("Login successful for {Email}", request.Email);
            return new AuthResponse(accessToken, refreshToken);
        }
        catch (UnauthorizedAccessException)
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new DbUpdateException("Login failed."), _logger);
        }
    }
}
