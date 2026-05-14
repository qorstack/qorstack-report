using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Exceptions;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.ExampleCategories.DeleteExampleCategory;

/// <summary>
/// Handler for DeleteExampleCategoryCommand
/// </summary>
public class DeleteExampleCategoryCommandHandler : IRequestHandler<DeleteExampleCategoryCommand>
{
    private readonly IApplicationDbContext _context;

    private readonly ILogger<DeleteExampleCategoryCommandHandler> _logger;

    public DeleteExampleCategoryCommandHandler(IApplicationDbContext context, ILogger<DeleteExampleCategoryCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Handle(DeleteExampleCategoryCommand request, CancellationToken cancellationToken)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var entity = await _context.ExampleCategories
                .FindAsync(new object[] { request.Id }, cancellationToken);

            if (entity == null)
            {
                throw new KeyNotFoundException($"Category with ID {request.Id} not found.");
            }

            // Check if category has products
            var hasProducts = await _context.ExampleProducts
                .AnyAsync(p => p.CategoryId == request.Id, cancellationToken);

            if (hasProducts)
            {
                throw new ValidationException("Cannot delete category that contains products.");
            }

            _context.ExampleCategories.Remove(entity);
            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new DbUpdateException($"Error deleting ExampleCategory '{request.Id}'."), _logger);
        }
    }
}
