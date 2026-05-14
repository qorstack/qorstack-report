using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Exceptions;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.ExampleProducts.UpdateExampleProduct;

/// <summary>
/// Handler for UpdateExampleProductCommand
/// </summary>
public class UpdateExampleProductCommandHandler : IRequestHandler<UpdateExampleProductCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    private readonly ILogger<UpdateExampleProductCommandHandler> _logger;

    public UpdateExampleProductCommandHandler(IApplicationDbContext context, IUser user, ILogger<UpdateExampleProductCommandHandler> logger)
    {
        _context = context;
        _user = user ?? throw new ArgumentNullException(nameof(user));
        _logger = logger;
    }

    public async Task Handle(UpdateExampleProductCommand request, CancellationToken cancellationToken)
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

            // Validate that category exists
            var categoryExists = await _context.ExampleCategories
                .AnyAsync(c => c.CategoryId == request.CategoryId, cancellationToken);

            if (!categoryExists)
            {
                throw new ValidationException("Invalid category ID.");
            }

            entity.Name = request.Name;
            entity.Price = request.Price;
            entity.CategoryId = request.CategoryId;
            entity.UpdatedDatetime = DateTime.UtcNow;
            entity.UpdatedBy = _user.Id;

            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new DbUpdateException($"Error updating ExampleProduct '{request.Id}'."), _logger);
        }
    }
}
