namespace QorstackReportService.Infrastructure.Services.Storage;

/// <summary>
/// Configuration settings for MinIO storage
/// </summary>
public class MinioSettings
{
    /// <summary>
    /// MinIO server endpoint (e.g., "localhost:9000")
    /// </summary>
    public string Endpoint { get; set; } = "localhost:9000";

    /// <summary>
    /// Public endpoint for generating presigned URLs (e.g., "https://minio.rendox.dev")
    /// </summary>
    public string? PublicEndpoint { get; set; }

    /// <summary>
    /// Access key for authentication
    /// </summary>
    public string AccessKey { get; set; } = string.Empty;

    /// <summary>
    /// Secret key for authentication
    /// </summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>
    /// Whether to use SSL for connections
    /// </summary>
    public bool UseSsl { get; set; } = false;

    /// <summary>
    /// AWS region (for S3 compatibility)
    /// </summary>
    public string Region { get; set; } = "us-east-1";

    /// <summary>
    /// Bucket name for storing templates
    /// </summary>
    public string TemplateBucket { get; set; } = "templates";

    /// <summary>
    /// Bucket name for storing generated reports
    /// </summary>
    public string ReportBucket { get; set; } = "reports";
}
