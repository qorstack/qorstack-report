using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data;

/// <summary>
/// Applies SQL migration files from one or more directories on startup.
/// Each file is applied in filename order and tracked in {schema}.__migration_history.
///
/// Configuration (appsettings.json):
///   "Database": {
///     "Schema": "public",                    // defaults to "public" if omitted
///     "MigrationPaths": ["database/oss"]
///   }
/// </summary>
public class DatabaseMigrationService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DatabaseMigrationService> _logger;
    private readonly IHostApplicationLifetime _appLifetime;

    public DatabaseMigrationService(
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILogger<DatabaseMigrationService> logger,
        IHostApplicationLifetime appLifetime)
    {
        _serviceProvider = serviceProvider;
        _configuration = configuration;
        _logger = logger;
        _appLifetime = appLifetime;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var schema = DatabaseSchema.Name;
        _logger.LogInformation("[Database] Migration starting (schema: {Schema})...", schema);

        var migrationPaths = ResolveMigrationPaths();

        if (migrationPaths.Count == 0)
        {
            _logger.LogWarning("[Database] No migration paths configured. Skipping.");
            return;
        }

        var connectionString = _configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrEmpty(connectionString))
        {
            _logger.LogWarning("[Database] No connection string found. Skipping.");
            return;
        }

        try
        {
            await using var conn = new NpgsqlConnection(connectionString);
            await conn.OpenAsync(stoppingToken);

            await EnsureSchemaExistsAsync(conn, schema, stoppingToken);

            // Safety check: prevent accidentally migrating into a schema that already
            // contains tables from another system (wrong-config protection).
            if (!await IsMigrationSafeAsync(conn, schema, stoppingToken))
            {
                _appLifetime.StopApplication();
                return;
            }

            await EnsureMigrationTableAsync(conn, schema, stoppingToken);

            // Collect all SQL files from all configured paths, sorted globally by filename
            var allFiles = migrationPaths
                .Where(Directory.Exists)
                .SelectMany(dir => Directory.GetFiles(dir, "*.sql"))
                .OrderBy(Path.GetFileName)
                .ToList();

            var applied = 0;

            foreach (var file in allFiles)
            {
                if (stoppingToken.IsCancellationRequested) break;

                var fileName = Path.GetFileName(file);

                if (await IsAlreadyAppliedAsync(conn, schema, fileName, stoppingToken))
                {
                    _logger.LogDebug("[Database] Skip (already applied): {File}", fileName);
                    continue;
                }

                _logger.LogInformation("[Database] Applying: {File}", fileName);

                var sql = await File.ReadAllTextAsync(file, stoppingToken);
                sql = RewriteSchema(sql, schema);

                await using var tx = await conn.BeginTransactionAsync(stoppingToken);
                try
                {
                    await using var cmd = new NpgsqlCommand(sql, conn, tx);
                    cmd.CommandTimeout = 120;
                    await cmd.ExecuteNonQueryAsync(stoppingToken);

                    await RecordMigrationAsync(conn, tx, schema, fileName, stoppingToken);
                    await tx.CommitAsync(stoppingToken);
                    applied++;
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync(stoppingToken);
                    _logger.LogError(ex, "[Database] Failed: {File}", fileName);
                    throw;
                }
            }

            if (applied > 0)
                _logger.LogInformation("[Database] Applied {Applied} migration(s)", applied);
            else
                _logger.LogInformation("[Database] Database is up to date");

            await SeedAdminUserAsync(conn, schema, stoppingToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "[Database] Migration failed");
            throw;
        }
    }

    /// <summary>
    /// Rewrites hardcoded "public." references in SQL files to the configured schema.
    /// Matches "public." preceded by whitespace, start-of-string, or common SQL delimiters
    /// so we don't accidentally touch substrings inside identifiers or strings.
    /// </summary>
    private static string RewriteSchema(string sql, string schema)
    {
        if (string.Equals(schema, "public", StringComparison.Ordinal))
            return sql;

        return System.Text.RegularExpressions.Regex.Replace(
            sql,
            @"(?<=[\s(,;]|^)public\.",
            schema + ".");
    }

    /// <summary>
    /// Returns false (and logs a clear remediation message) when the target schema
    /// already contains tables but no __migration_history table — meaning data from
    /// another system likely lives there. Prevents a misconfigured SearchPath from
    /// corrupting existing data. Returns true when it's safe to proceed.
    /// </summary>
    private async Task<bool> IsMigrationSafeAsync(NpgsqlConnection conn, string schema, CancellationToken ct)
    {
        const string sql = """
            SELECT
                COUNT(*) FILTER (WHERE table_name <> '__migration_history') AS other_tables,
                COUNT(*) FILTER (WHERE table_name  = '__migration_history') AS history_table
            FROM information_schema.tables
            WHERE table_schema = @schema AND table_type = 'BASE TABLE';
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("schema", schema);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        await reader.ReadAsync(ct);
        var otherTables = reader.GetInt64(0);
        var hasHistory = reader.GetInt64(1) > 0;

        if (otherTables > 0 && !hasHistory)
        {
            var message = $"""

                ╔══════════════════════════════════════════════════════════════════════╗
                ║  [Database] MIGRATION ABORTED — Safety check failed                  ║
                ╚══════════════════════════════════════════════════════════════════════╝

                Schema '{schema}' already contains {otherTables} table(s) but no
                '__migration_history' table was found.

                Refusing to run migrations to avoid overwriting existing data.

                How to fix — pick ONE of these:

                  1) Wrong schema in connection string?
                     Edit appsettings.Development.json → ConnectionStrings.DefaultConnection
                     and change/remove the 'SearchPath=...' parameter.

                  2) Schema '{schema}' is the right one but holds leftover/test data?
                     Drop it and let the app recreate it cleanly:
                         DROP SCHEMA "{schema}" CASCADE;
                         CREATE SCHEMA "{schema}";

                  3) Schema '{schema}' was migrated by an older version (pre-history)?
                     Manually create the tracking table so this check passes:
                         CREATE TABLE "{schema}".__migration_history (
                             id          serial          PRIMARY KEY,
                             file_name   varchar(255)    NOT NULL UNIQUE,
                             applied_at  timestamptz     NOT NULL DEFAULT now(),
                             applied_by  varchar(100)    NOT NULL DEFAULT 'SYSTEM'
                         );
                     Then INSERT one row per already-applied SQL file name.

                The application will now shut down. Fix the issue and restart.
                """;

            _logger.LogError("{Message}", message);

            return false;
        }

        return true;
    }

    /// <summary>
    /// Seeds an initial admin user from Admin:Email / Admin:Password config.
    /// Only runs when the users table is empty (fresh install).
    /// Set these via environment variables: Admin__Email and Admin__Password.
    /// </summary>
    private async Task SeedAdminUserAsync(NpgsqlConnection conn, string schema, CancellationToken ct)
    {
        var email = _configuration["Admin:Email"];
        var password = _configuration["Admin:Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogDebug("[Database] Admin:Email / Admin:Password not configured — skipping admin seed");
            return;
        }

        await using var countCmd = new NpgsqlCommand($"SELECT COUNT(1) FROM {schema}.users", conn);
        var count = (long)(await countCmd.ExecuteScalarAsync(ct))!;
        if (count > 0)
        {
            _logger.LogDebug("[Database] Admin seed skipped — users table is not empty");
            return;
        }

        var hasher = new PasswordHasher<User>();
        var hash = hasher.HashPassword(new User(), password);

        var sql = $"""
            INSERT INTO {schema}.users (email, password_hash, first_name, last_name, status, created_by)
            VALUES (@email, @hash, 'Admin', 'User', 'active', 'SYSTEM_INIT')
            ON CONFLICT (email) DO NOTHING;
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("email", email);
        cmd.Parameters.AddWithValue("hash", hash);
        await cmd.ExecuteNonQueryAsync(ct);

        _logger.LogInformation("[Database] Admin user created: {Email}", email);
    }

    /// <summary>
    /// Resolves the list of migration directories from configuration.
    /// Supports both "MigrationPaths" (array) and legacy "MigrationPath" (string).
    /// </summary>
    private List<string> ResolveMigrationPaths()
    {
        var paths = new List<string>();

        // New format: "Database:MigrationPaths" as an array
        var configuredPaths = _configuration.GetSection("Database:MigrationPaths").Get<string[]>();
        if (configuredPaths?.Length > 0)
        {
            paths.AddRange(configuredPaths);
        }
        else
        {
            // Legacy format: "Database:MigrationPath" as a single string
            var singlePath = _configuration["Database:MigrationPath"] ?? "database";
            paths.Add(singlePath);
        }

        // Resolve relative paths against the application base directory
        return paths
            .Select(p => Path.IsPathRooted(p) ? p : Path.Combine(AppContext.BaseDirectory, p))
            .ToList();
    }

    private static async Task EnsureSchemaExistsAsync(NpgsqlConnection conn, string schema, CancellationToken ct)
    {
        // schema name is validated by DatabaseSchema.Set — safe to interpolate.
        var sql = $"CREATE SCHEMA IF NOT EXISTS \"{schema}\";";
        await using var cmd = new NpgsqlCommand(sql, conn);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task EnsureMigrationTableAsync(NpgsqlConnection conn, string schema, CancellationToken ct)
    {
        var sql = $"""
            CREATE TABLE IF NOT EXISTS {schema}.__migration_history (
                id          serial          PRIMARY KEY,
                file_name   varchar(255)    NOT NULL UNIQUE,
                applied_at  timestamptz     NOT NULL DEFAULT now(),
                applied_by  varchar(100)    NOT NULL DEFAULT 'SYSTEM'
            );
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task<bool> IsAlreadyAppliedAsync(NpgsqlConnection conn, string schema, string fileName, CancellationToken ct)
    {
        var sql = $"SELECT COUNT(1) FROM {schema}.__migration_history WHERE file_name = @fileName";
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("fileName", fileName);
        var count = (long)(await cmd.ExecuteScalarAsync(ct))!;
        return count > 0;
    }

    private static async Task RecordMigrationAsync(NpgsqlConnection conn, NpgsqlTransaction tx, string schema, string fileName, CancellationToken ct)
    {
        var sql = $"""
            INSERT INTO {schema}.__migration_history (file_name, applied_by)
            VALUES (@fileName, 'STARTUP')
            ON CONFLICT (file_name) DO NOTHING;
            """;

        await using var cmd = new NpgsqlCommand(sql, conn, tx);
        cmd.Parameters.AddWithValue("fileName", fileName);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
