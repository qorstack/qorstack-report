using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace QorstackReportService.Infrastructure.Services;

/// <summary>
/// Runs all registered health checks once at startup and prints a status banner to the console.
/// Delays slightly so that other IHostedServices (migrations, storage init, font sync) finish first.
/// </summary>
public class StartupReadinessService : BackgroundService
{
    private readonly HealthCheckService _healthCheckService;
    private readonly ILogger<StartupReadinessService> _logger;

    public StartupReadinessService(HealthCheckService healthCheckService, ILogger<StartupReadinessService> logger)
    {
        _healthCheckService = healthCheckService;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait for other hosted services (migrations, storage, font sync) to finish
        await Task.Delay(3000, stoppingToken);
        if (stoppingToken.IsCancellationRequested) return;

        var rawUrl = Environment.GetEnvironmentVariable("ASPNETCORE_URLS") ?? "http://localhost:5000";
        var displayUrl = rawUrl.Split(';').First().Replace("*", "localhost").Replace("+", "localhost");

        // ASCII art banner
        Console.WriteLine();
        Console.WriteLine(@"________                         __                 __    ");
        Console.WriteLine(@"\_____  \   ___________  _______/  |______    ____ |  | __");
        Console.WriteLine(@" /  / \  \ /  _ \_  __ \/  ___/\   __\__  \ _/ ___\|  |/ /");
        Console.WriteLine(@"/   \_/.  (  <_> )  | \/\___ \  |  |  / __ \\  \___|    < ");
        Console.WriteLine(@"\_____\ \_/\____/|__|  /____  > |__| (____  /\___  >__|_ \");
        Console.WriteLine(@"       \__>                 \/            \/     \/     \/");
        Console.WriteLine(@"__________                             __                 ");
        Console.WriteLine(@"\______   \ ____ ______   ____________/  |_               ");
        Console.WriteLine(@" |       _// __ \\____ \ /  _ \_  __ \   __\              ");
        Console.WriteLine(@" |    |   \  ___/|  |_> >  <_> )  | \/|  |                ");
        Console.WriteLine(@" |____|_  /\___  >   __/ \____/|__|   |__|                ");
        Console.WriteLine(@"        \/     \/|__|                                     ");
        Console.WriteLine();
        Console.WriteLine($"  ▶  {displayUrl}");
        Console.WriteLine();

        // Environment health check
        var report = await _healthCheckService.CheckHealthAsync(stoppingToken);

        foreach (var (name, entry) in report.Entries.OrderBy(e => e.Key))
        {
            var isOk = entry.Status == HealthStatus.Healthy;
            var ms = $"{entry.Duration.TotalMilliseconds:F0}ms";
            var detail = isOk
                ? entry.Description ?? ""
                : entry.Description ?? entry.Exception?.Message ?? "unhealthy";

            Console.Write("  ");
            Console.ForegroundColor = isOk ? ConsoleColor.Green : ConsoleColor.Red;
            Console.Write(isOk ? "✓" : "✗");
            Console.ResetColor();
            Console.Write($"  {name,-12}  {detail,-44}");
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.WriteLine(ms);
            Console.ResetColor();
        }

        Console.WriteLine();

        if (report.Status != HealthStatus.Healthy)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.Error.WriteLine("  WARNING: Some dependencies are not ready. Check the errors above.");
            Console.ResetColor();
            _logger.LogWarning("Startup health check failed — {Status}. See console for details.", report.Status);
        }
    }
}
