using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Exceptions;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.ExampleCategories.CreateExampleCategory;

/// <summary>
/// Handler for CreateExampleCategoryCommand
/// </summary>
public class CreateExampleCategoryCommandHandler : IRequestHandler<CreateExampleCategoryCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    private readonly ILogger<CreateExampleCategoryCommandHandler> _logger;

    public CreateExampleCategoryCommandHandler(IApplicationDbContext context, IUser user, ILogger<CreateExampleCategoryCommandHandler> logger)
    {
        _context = context;
        _user = user ?? throw new ArgumentNullException(nameof(user));
        _logger = logger;
    }

    public async Task<int> Handle(CreateExampleCategoryCommand request, CancellationToken cancellationToken)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var entity = new ExampleCategory
            {
                Name = request.Name,
                CreatedDatetime = DateTime.UtcNow,
                CreatedBy = _user.Id
            };

            _context.ExampleCategories.Add(entity);
            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return entity.CategoryId;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new DbUpdateException($"Error creating ExampleCategory '{request.Name}'."), _logger);
        }
    }
}
