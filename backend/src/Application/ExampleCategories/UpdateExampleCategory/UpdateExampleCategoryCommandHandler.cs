using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Exceptions;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.ExampleCategories.UpdateExampleCategory;

/// <summary>
/// Handler for UpdateExampleCategoryCommand
/// </summary>
public class UpdateExampleCategoryCommandHandler : IRequestHandler<UpdateExampleCategoryCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    private readonly ILogger<UpdateExampleCategoryCommandHandler> _logger;

    public UpdateExampleCategoryCommandHandler(IApplicationDbContext context, IUser user, ILogger<UpdateExampleCategoryCommandHandler> logger)
    {
        _context = context;
        _user = user ?? throw new ArgumentNullException(nameof(user));
        _logger = logger;
    }

    public async Task Handle(UpdateExampleCategoryCommand request, CancellationToken cancellationToken)
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

            entity.Name = request.Name;
            entity.UpdatedDatetime = DateTime.UtcNow;
            entity.UpdatedBy = _user.Id;

            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new DbUpdateException($"Error updating ExampleCategory '{request.Id}'."), _logger);
        }
    }
}
