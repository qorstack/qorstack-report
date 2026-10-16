using Microsoft.Extensions.Configuration;

namespace QorstackReportService.Infrastructure.Services.Storage;

/// <summary>
/// S3-compatible object storage (RustFS by default, MinIO, AWS S3, Cloudflare R2, …).
/// Bound from the <c>Storage</c> section; any value missing there falls back to the legacy
/// <c>Minio</c> section, so <c>Minio__*</c> / <c>MINIO_*</c> settings from v1 keep working.
/// </summary>
public class StorageSettings
{
    /// <summary>S3 endpoint as host:port, without scheme (e.g. "qorstack-storage:9000").</summary>
    public string Endpoint { get; set; } = "localhost:9000";

    /// <summary>
    /// Optional, legacy. Downloads now go through the API (<c>/files/{token}</c>), so storage does not need a
    /// public address. Only used to recognise presigned URLs stored by v1 builder payloads.
    /// </summary>
    public string? PublicEndpoint { get; set; }

    public string AccessKey { get; set; } = string.Empty;

    public string SecretKey { get; set; } = string.Empty;

    /// <summary>True when <see cref="Endpoint"/> speaks HTTPS.</summary>
    public bool UseSsl { get; set; } = false;

    /// <summary>S3 region. Most self-hosted servers accept the default.</summary>
    public string Region { get; set; } = "us-east-1";

    /// <summary>
    /// The single bucket that holds everything. Areas are folders inside it:
    /// <c>template/</c>, <c>generated-report/</c>, <c>fonts/</c> (see <c>StorageAreas</c>).
    /// </summary>
    public string Bucket { get; set; } = "qorstack-report";

    /// <summary>Path-style addressing (http://host/bucket/key). Required by RustFS/MinIO; keep true unless your provider needs virtual-host style.</summary>
    public bool ForcePathStyle { get; set; } = true;

    /// <summary>
    /// Binds <c>Minio</c> first, then <c>Storage</c> on top, so new names win and old names still work.
    /// Blank values are skipped, so an empty placeholder in appsettings.json never hides a real env value.
    /// </summary>
    public static void Bind(StorageSettings target, IConfiguration configuration)
    {
        foreach (var section in new[] { "Minio", "Storage" })
        {
            var values = configuration.GetSection(section).GetChildren()
                .Where(c => !string.IsNullOrWhiteSpace(c.Value))
                .ToDictionary(c => c.Key, c => c.Value);
            new ConfigurationBuilder().AddInMemoryCollection(values).Build().Bind(target);
        }
    }
}
