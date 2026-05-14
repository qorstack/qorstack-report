using QorstackReportService.Application.Common.Exceptions;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Users.Commands.RevokeApiKey;

/// <summary>
/// Handler for RevokeApiKeyCommand
/// </summary>
public class RevokeApiKeyCommandHandler : IRequestHandler<RevokeApiKeyCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;
    private readonly ILogger<RevokeApiKeyCommandHandler> _logger;

    public RevokeApiKeyCommandHandler(IApplicationDbContext context, IUser currentUser, ILogger<RevokeApiKeyCommandHandler> logger)
    {
        _context = context;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<Unit> Handle(RevokeApiKeyCommand request, CancellationToken cancellationToken)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var apiKey = await _context.ApiKeys
                .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken);

            if (apiKey == null)
            {
                throw new KeyNotFoundException($"ApiKey with id {request.Id} not found.");
            }

            apiKey.IsActive = false;
            apiKey.UpdatedBy = _currentUser.Id;
            apiKey.UpdatedDatetime = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return Unit.Value;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new Exception($"Failed to revoke API key {request.Id}."), _logger);
        }
    }
}
