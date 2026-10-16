namespace QorstackReportService.Web.Infrastructure;

/// <summary>
/// Lets the backend read the same flat variable names the deploy files use (DB_HOST, STORAGE_ENDPOINT, JWT_KEY …),
/// so one <c>.env</c> works for local development (<c>dotnet watch</c>) and for Docker.
/// <list type="bullet">
/// <item>In Development the repo-root <c>.env</c> is loaded (real environment variables always win).</item>
/// <item>Flat names are mapped to configuration keys exactly like the compose files do; an explicit
/// <c>Section__Key</c> environment variable still wins over the flat name.</item>
/// </list>
/// The mapping table below is the single source of truth.
/// </summary>
public static class FlatEnvConfiguration
{
    /// <summary>Flat variable(s) → configuration key. Several names = fallbacks, first one set wins.</summary>
    public static readonly IReadOnlyList<(string[] Names, string Key)> Map =
    [
        (["ADMIN_EMAIL"], "Admin:Email"),
        (["ADMIN_PASSWORD"], "Admin:Password"),

        (["STORAGE_ENDPOINT", "MINIO_ENDPOINT"], "Storage:Endpoint"),
        (["STORAGE_ACCESS_KEY", "MINIO_ACCESS_KEY"], "Storage:AccessKey"),
        (["STORAGE_SECRET_KEY", "MINIO_SECRET_KEY"], "Storage:SecretKey"),
        (["STORAGE_USE_SSL", "MINIO_USE_SSL"], "Storage:UseSsl"),
        (["STORAGE_REGION"], "Storage:Region"),
        (["STORAGE_BUCKET", "MINIO_BUCKET"], "Storage:Bucket"),

        (["PUBLIC_URL"], "App:PublicUrl"),
        (["GOTENBERG_URL"], "Gotenberg:BaseUrl"),
        (["FONTS_RENDERER_CACHE_PATH"], "Fonts:RendererCachePath"),

        (["JWT_KEY"], "Jwt:Key"),
        (["JWT_ISSUER"], "Jwt:Issuer"),
        (["JWT_AUDIENCE"], "Jwt:Audience"),
        (["ENCRYPTION_KEY"], "Encryption:Key"),
        (["ENCRYPTION_IV"], "Encryption:IV"),
        (["CORS_ORIGINS"], "Cors:AllowedOriginsString"),

        (["GOOGLE_CLIENT_ID"], "Google:ClientId"),
        (["GITHUB_CLIENT_ID"], "GitHub:ClientId"),
        (["GITHUB_CLIENT_SECRET"], "GitHub:ClientSecret"),

        (["IMAGE_FETCH_ALLOW_PRIVATE_NETWORKS"], "ImageFetch:AllowPrivateNetworks"),
        (["RENDER_ASYNC_WORKERS"], "Render:AsyncWorkers"),
        (["RENDER_JOB_LEASE_SECONDS"], "Render:JobLeaseSeconds"),
        (["RENDER_POLL_SECONDS"], "Render:PollSeconds"),
        (["RENDER_MAX_PENDING_JOBS_PER_USER"], "Render:MaxPendingJobsPerUser"),
        (["RENDER_MAX_BODY_MB"], "Render:MaxBodyMb"),
        (["RENDER_MAX_TABLE_ROWS"], "Render:MaxTableRows"),
        (["RENDER_MAX_ITEMS_PER_FIELD"], "Render:MaxItemsPerField"),
        (["PROJECT_IMPORT_MAX_MB"], "Transfer:MaxZipMb"),
        (["WEBHOOK_SIGNING_SECRET"], "Webhook:SigningSecret"),
        (["WEBHOOK_ALLOW_PRIVATE_NETWORKS"], "Webhook:AllowPrivateNetworks"),

        (["PRO_LICENSE_FILE"], "Pro:LicenseFile"),
    ];

    /// <summary>Configuration key built from DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD (+ optional DB_SCHEMA).</summary>
    public const string ConnectionStringKey = "ConnectionStrings:DefaultConnection";

    /// <summary>
    /// Resolves the configuration values for every flat variable that is set.
    /// <paramref name="get"/> returns a flat variable's value (environment, then .env); <paramref name="hasExplicit"/>
    /// tells whether an explicit <c>Section__Key</c> environment variable exists (that one must win).
    /// </summary>
    public static Dictionary<string, string?> Resolve(Func<string, string?> get, Func<string, bool>? hasExplicit = null)
    {
        hasExplicit ??= _ => false;
        var result = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        foreach (var (names, key) in Map)
        {
            if (hasExplicit(key)) continue;
            var value = names.Select(get).FirstOrDefault(v => !string.IsNullOrEmpty(v));
            if (value != null) result[key] = value;
        }

        // DB_* → one Npgsql connection string (same defaults as the compose files).
        if (!hasExplicit(ConnectionStringKey) && (!string.IsNullOrEmpty(get("DB_HOST")) || !string.IsNullOrEmpty(get("DB_PASSWORD"))))
        {
            string Or(string name, string fallback) => string.IsNullOrEmpty(get(name)) ? fallback : get(name)!;
            result[ConnectionStringKey] =
                $"Host={Or("DB_HOST", "localhost")};Port={Or("DB_PORT", "5432")};Database={Or("DB_NAME", "qorstack_report")};" +
                $"Username={Or("DB_USER", "postgres")};Password={get("DB_PASSWORD") ?? string.Empty}" +
                (string.IsNullOrEmpty(get("DB_SCHEMA")) ? string.Empty : $";Search Path={get("DB_SCHEMA")}");
        }

        return result;
    }

    /// <summary>Parses KEY=VALUE lines (comments, blanks, `export ` prefixes and surrounding quotes handled).</summary>
    public static Dictionary<string, string> ParseDotEnv(string text)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var rawLine in text.Split('\n'))
        {
            var line = rawLine.Trim().TrimEnd('\r');
            if (line.Length == 0 || line.StartsWith('#')) continue;
            if (line.StartsWith("export ", StringComparison.Ordinal)) line = line[7..].TrimStart();

            var eq = line.IndexOf('=');
            if (eq <= 0) continue;
            var key = line[..eq].Trim();
            var value = line[(eq + 1)..].Trim();

            if (value.Length >= 2 && (value[0] == '"' || value[0] == '\'') && value[^1] == value[0])
                value = value[1..^1];
            else
            {
                // Inline comment only when preceded by whitespace (keeps '#' inside passwords).
                var hash = value.IndexOf(" #", StringComparison.Ordinal);
                if (hash >= 0) value = value[..hash].TrimEnd();
            }

            values[key] = value;
        }
        return values;
    }

    /// <summary>Walks up from <paramref name="startDirectory"/> to the repository root and returns its .env path, if any.</summary>
    public static string? FindRepoDotEnv(string startDirectory)
    {
        for (var dir = new DirectoryInfo(startDirectory); dir != null; dir = dir.Parent)
        {
            var isRepoRoot = Directory.Exists(Path.Combine(dir.FullName, ".git")) || File.Exists(Path.Combine(dir.FullName, "versions.mk"));
            if (!isRepoRoot) continue;
            var path = Path.Combine(dir.FullName, ".env");
            return File.Exists(path) ? path : null;
        }
        return null;
    }

    /// <summary>
    /// Adds the flat-name mapping to <paramref name="builder"/>'s configuration. In Development the repo-root .env is read
    /// first; real environment variables always take precedence over it.
    /// </summary>
    public static void AddFlatEnvironment(this WebApplicationBuilder builder)
    {
        var dotEnv = new Dictionary<string, string>();
        if (builder.Environment.IsDevelopment())
        {
            var path = FindRepoDotEnv(builder.Environment.ContentRootPath);
            if (path != null) dotEnv = ParseDotEnv(File.ReadAllText(path));
        }

        var values = Resolve(
            name => Environment.GetEnvironmentVariable(name) ?? dotEnv.GetValueOrDefault(name),
            key => Environment.GetEnvironmentVariable(key.Replace(":", "__")) != null);

        if (values.Count > 0)
            builder.Configuration.AddInMemoryCollection(values);
    }
}
