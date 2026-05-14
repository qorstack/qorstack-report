using QorstackReportService.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace QorstackReportService.Infrastructure.Data;

/// <summary>
/// Factory for creating application database contexts.
/// Provides thread-safe context creation for parallel operations.
/// </summary>
public class ApplicationDbContextFactory : IApplicationDbContextFactory
{
    private readonly IDbContextFactory<ApplicationDbContext> _contextFactory;

    public ApplicationDbContextFactory(IDbContextFactory<ApplicationDbContext> contextFactory)
    {
        _contextFactory = contextFactory;
    }

    /// <summary>
    /// Creates a new instance of the application database context.
    /// </summary>
    /// <returns>A new IApplicationDbContext instance</returns>
    public IApplicationDbContext CreateDbContext()
    {
        return _contextFactory.CreateDbContext();
    }
}
