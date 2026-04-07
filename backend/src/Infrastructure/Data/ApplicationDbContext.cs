using System.Reflection;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;
using QorstackReportService.Infrastructure.Data.Attributes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace QorstackReportService.Infrastructure.Data;

public partial class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    #region Generated DbSets (from ApplicationDbContext.DbSets.cs)
    // DbSets from database generation are defined in partial class ApplicationDbContext.DbSets.cs
    // This allows the main ApplicationDbContext.cs to remain unchanged while DbSets are generated
    // Note: In C#, partial classes are automatically merged at compile time.
    // No explicit import is needed - the DbSets are available as part of this class.
    // See: ApplicationDbContext.DbSets.cs for the generated DbSet properties.
    #endregion

    #region Example Entities (Template)
    public DbSet<ExampleCategory> ExampleCategories { get; set; }
    public DbSet<ExampleProduct> ExampleProducts { get; set; }
    #endregion

    Task<int> IApplicationDbContext.SaveChangesAsync(CancellationToken cancellationToken)
    {
        return SaveChangesAsync(cancellationToken);
    }

    DatabaseFacade IApplicationDbContext.Database => Database;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("public");
        base.OnModelCreating(builder);

        // Apply base configurations first
        ApplyBaseConfigurations(builder);

        // Apply override configurations last (จะ override ค่าเดิม)
        ApplyOverrideConfigurations(builder);
    }

    /// <summary>
    /// Apply base configurations (standard entity configurations)
    /// </summary>
    private void ApplyBaseConfigurations(ModelBuilder builder)
    {
        var configTypes = Assembly.GetExecutingAssembly()
            .GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract &&
                       t.GetInterfaces().Any(i => i.IsGenericType &&
                                                 i.GetGenericTypeDefinition() == typeof(IEntityTypeConfiguration<>)) &&
                       !t.GetCustomAttributes<OverrideConfigurationAttribute>().Any())
            .ToArray();

        foreach (var configType in configTypes)
        {
            var config = Activator.CreateInstance(configType);
            var applyMethod = typeof(ModelBuilder).GetMethod("ApplyConfiguration")!
                .MakeGenericMethod(configType.GetInterfaces()
                    .First(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IEntityTypeConfiguration<>))
                    .GetGenericArguments()[0]);

            applyMethod.Invoke(builder, new[] { config });
        }
    }

    /// <summary>
    /// Apply override configurations (จะ override base configurations)
    /// เรียงตาม Priority จากน้อยไปมาก
    /// </summary>
    private void ApplyOverrideConfigurations(ModelBuilder builder)
    {
        var overrideConfigTypes = Assembly.GetExecutingAssembly()
            .GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract &&
                       t.GetInterfaces().Any(i => i.IsGenericType &&
                                                 i.GetGenericTypeDefinition() == typeof(IEntityTypeConfiguration<>)) &&
                       t.GetCustomAttributes<OverrideConfigurationAttribute>().Any())
            .OrderBy(t => t.GetCustomAttribute<OverrideConfigurationAttribute>()?.Priority ?? 0)
            .ToArray();

        foreach (var configType in overrideConfigTypes)
        {
            var config = Activator.CreateInstance(configType);
            var applyMethod = typeof(ModelBuilder).GetMethod("ApplyConfiguration")!
                .MakeGenericMethod(configType.GetInterfaces()
                    .First(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IEntityTypeConfiguration<>))
                    .GetGenericArguments()[0]);

            applyMethod.Invoke(builder, new[] { config });
        }
    }
}
