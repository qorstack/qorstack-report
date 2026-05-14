using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Npgsql;
using QorstackReportService.Infrastructure.Data;

namespace QorstackReportService.Infrastructure.HealthChecks;

public class DatabaseHealthCheck : IHealthCheck
{
    private readonly IDbContextFactory<ApplicationDbContext> _dbFactory;
    private readonly IConfiguration _configuration;

    public DatabaseHealthCheck(IDbContextFactory<ApplicationDbContext> dbFactory, IConfiguration configuration)
    {
        _dbFactory = dbFactory;
        _configuration = configuration;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
            await db.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken);

            var url = BuildDisplayUrl(_configuration.GetConnectionString("DefaultConnection"));
            return HealthCheckResult.Healthy(url);
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy(ex.Message);
        }
    }

    private static string BuildDisplayUrl(string? connectionString)
    {
        if (string.IsNullOrEmpty(connectionString)) return "postgresql://unknown";
        try
        {
            var builder = new NpgsqlConnectionStringBuilder(connectionString);
            return $"postgresql://{builder.Host ?? "localhost"}:{builder.Port}";
        }
        catch
        {
            return "postgresql://unknown";
        }
    }
}
