using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Exceptions;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.ExampleProducts.CreateExampleProduct;

/// <summary>
/// Handler for CreateExampleProductCommand
/// </summary>
public class CreateExampleProductCommandHandler : IRequestHandler<CreateExampleProductCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    private readonly ILogger<CreateExampleProductCommandHandler> _logger;

    public CreateExampleProductCommandHandler(IApplicationDbContext context, IUser user, ILogger<CreateExampleProductCommandHandler> logger)
    {
        _context = context;
        _user = user ?? throw new ArgumentNullException(nameof(user));
        _logger = logger;
    }

    public async Task<int> Handle(CreateExampleProductCommand request, CancellationToken cancellationToken)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Validate that category exists
            var categoryExists = await _context.ExampleCategories
                .AnyAsync(c => c.CategoryId == request.CategoryId, cancellationToken);

            if (!categoryExists)
            {
                throw new ValidationException("Invalid category ID.");
            }

            var entity = new ExampleProduct
            {
                Name = request.Name,
                Price = request.Price,
                CategoryId = request.CategoryId,
                CreatedDatetime = DateTime.UtcNow,
                CreatedBy = _user.Id
            };

            _context.ExampleProducts.Add(entity);
            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return entity.ProductId;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new DbUpdateException($"Error creating ExampleProduct '{request.Name}'."), _logger);
        }
    }
}
