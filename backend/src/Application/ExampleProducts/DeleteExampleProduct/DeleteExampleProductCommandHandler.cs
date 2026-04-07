using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Exceptions;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.ExampleProducts.DeleteExampleProduct;

/// <summary>
/// Handler for DeleteExampleProductCommand
/// </summary>
public class DeleteExampleProductCommandHandler : IRequestHandler<DeleteExampleProductCommand>
{
    private readonly IApplicationDbContext _context;

    private readonly ILogger<DeleteExampleProductCommandHandler> _logger;

    public DeleteExampleProductCommandHandler(IApplicationDbContext context, ILogger<DeleteExampleProductCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Handle(DeleteExampleProductCommand request, CancellationToken cancellationToken)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var entity = await _context.ExampleProducts
                .FindAsync(new object[] { request.Id }, cancellationToken);

            if (entity == null)
            {
                throw new KeyNotFoundException($"Product with ID {request.Id} not found.");
            }

            _context.ExampleProducts.Remove(entity);
            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new DbUpdateException($"Error deleting ExampleProduct '{request.Id}'."), _logger);
        }
    }
}
