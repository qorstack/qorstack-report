using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Auth.Commands.RevokeToken;

public record RevokeTokenCommand(string RefreshToken) : IRequest<Unit>;

public class RevokeTokenCommandHandler : IRequestHandler<RevokeTokenCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<RevokeTokenCommandHandler> _logger;

    public RevokeTokenCommandHandler(
        IApplicationDbContext context,
        ILogger<RevokeTokenCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Unit> Handle(RevokeTokenCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Revoke token request");

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var storedToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken, cancellationToken);

            if (storedToken != null)
            {
                storedToken.RevokedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("Token revoked");
            return Unit.Value;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception("Failed to revoke token."), _logger);
        }
    }
}
