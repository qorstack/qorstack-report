using QorstackReportService.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace QorstackReportService.Application.Common.Interfaces;

public partial interface IApplicationDbContext : IDisposable
{
    #region Generated DbSets (from IApplicationDbContext.DbSets.cs)
    // Note: Additional DbSets from database generation are in partial interface IApplicationDbContext.DbSets.cs
    // In C#, partial interfaces are automatically merged at compile time.
    // No explicit import is needed - the DbSets are available as part of this interface.
    // See: IApplicationDbContext.DbSets.cs for the generated DbSet properties.
    #endregion

    #region Example Entities (Template)
    public DbSet<ExampleCategory> ExampleCategories { get; set; }
    public DbSet<ExampleProduct> ExampleProducts { get; set; }
    #endregion

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);

    /// <summary>
    /// so consumers can do BeginTransactionAsync(), Commit(), Rollback(), etc.
    /// </summary>
    DatabaseFacade Database { get; }
}

/// <summary>
/// Factory interface for creating application database contexts.
/// Used for parallel database operations where multiple contexts are needed.
/// </summary>
public interface IApplicationDbContextFactory
{
    /// <summary>
    /// Creates a new instance of the application database context.
    /// </summary>
    /// <returns>A new IApplicationDbContext instance</returns>
    IApplicationDbContext CreateDbContext();
}
