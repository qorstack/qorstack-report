namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Service interface for MinIO object storage operations
/// </summary>
public interface IMinioStorageService
{
    /// <summary>
    /// Uploads a file to the specified bucket
    /// </summary>
    /// <param name="bucketName">The name of the bucket</param>
    /// <param name="objectName">The object name/path in the bucket</param>
    /// <param name="data">The file data stream</param>
    /// <param name="contentType">The MIME type of the file</param>
    /// <returns>The object name of the uploaded file</returns>
    Task<string> UploadFileAsync(string bucketName, string objectName, Stream data, string contentType);

    /// <summary>
    /// Downloads a file from the specified bucket
    /// </summary>
    /// <param name="bucketName">The name of the bucket</param>
    /// <param name="objectName">The object name/path in the bucket</param>
    /// <returns>A stream containing the file data</returns>
    Task<Stream> DownloadFileAsync(string bucketName, string objectName);

    /// <summary>
    /// Creates a temporary download link for a file. Since v2 this is an API link
    /// (<c>{App:PublicUrl}/files/{token}</c>, signed and time-limited) — not a presigned storage URL —
    /// so the storage server never has to be reachable from the browser.
    /// </summary>
    /// <param name="bucketName">The name of the bucket</param>
    /// <param name="objectName">The object name/path in the bucket</param>
    /// <param name="expirySeconds">URL expiry time in seconds (default: 3600)</param>
    /// <param name="downloadFileName">Optional file name to force on download via Content-Disposition.
    /// When set, the browser/HTTP client saves the file under this name regardless of the object key.</param>
    /// <returns>A time-limited download link</returns>
    Task<string> GetPresignedUrlAsync(string bucketName, string objectName, int expirySeconds = 3600, string? downloadFileName = null);

    /// <summary>
    /// Deletes a file from the specified bucket
    /// </summary>
    /// <param name="bucketName">The name of the bucket</param>
    /// <param name="objectName">The object name/path in the bucket</param>
    Task DeleteFileAsync(string bucketName, string objectName);

    /// <summary>
    /// Checks if a file exists in the specified bucket
    /// </summary>
    /// <param name="bucketName">The name of the bucket</param>
    /// <param name="objectName">The object name/path in the bucket</param>
    /// <returns>True if the file exists, false otherwise</returns>
    Task<bool> FileExistsAsync(string bucketName, string objectName);

    /// <summary>
    /// Ensures the specified bucket exists, creating it if necessary
    /// </summary>
    /// <param name="bucketName">The name of the bucket</param>
    Task EnsureBucketExistsAsync(string bucketName);

    /// <summary>
    /// Sets a lifecycle policy on the bucket to expire objects with a given prefix after a specified number of days.
    /// </summary>
    /// <param name="bucketName">The name of the bucket</param>
    /// <param name="days">Number of days after which objects expire</param>
    /// <param name="prefix">Prefix filter for the rule (optional)</param>
    Task SetBucketLifecycleAsync(string bucketName, int days, string prefix = "");

    /// <summary>
    /// Resolves a "minio:{bucket}/{objectName}" path to a presigned URL.
    /// Returns the original value if it doesn't start with "minio:".
    /// </summary>
    /// <param name="minioPath">The minio path (e.g., "minio:reports/sandbox-assets/...")</param>
    /// <param name="expirySeconds">URL expiry time in seconds (default: 3600)</param>
    /// <returns>A presigned URL or the original value unchanged</returns>
    Task<string> ResolveMinioPathAsync(string minioPath, int expirySeconds = 3600);

    /// <summary>
    /// Deletes all objects matching a prefix in the specified bucket
    /// </summary>
    /// <param name="bucketName">The name of the bucket</param>
    /// <param name="prefix">The prefix to match objects for deletion</param>
    Task DeleteByPrefixAsync(string bucketName, string prefix);

    /// <summary>
    /// Tries to convert a download link we issued (<c>/files/{token}</c>, or a v1 presigned storage URL)
    /// back to a "minio:{area}/{objectName}" path. Returns null for any other URL.
    /// </summary>
    /// <param name="url">The link to convert</param>
    /// <returns>The minio: path if recognized, null otherwise</returns>
    string? TryConvertToMinioPath(string url);

    /// <summary>
    /// Lists all objects in the specified bucket with optional prefix filter.
    /// </summary>
    Task<IReadOnlyList<MinioObjectInfo>> ListObjectsAsync(string bucketName, string? prefix = null);

    /// <summary>Object metadata, or null when the object does not exist.</summary>
    Task<StoredObjectInfo?> StatAsync(string bucketName, string objectName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Streams an object (or the byte range offset..offset+length-1) straight into <paramref name="destination"/>
    /// without buffering the whole file in memory.
    /// </summary>
    Task CopyToAsync(string bucketName, string objectName, Stream destination, long offset = 0, long? length = null, CancellationToken cancellationToken = default);

    /// <summary>True when the storage server answers (used by health checks and startup).</summary>
    Task<bool> IsReachableAsync(CancellationToken cancellationToken = default);
}

public record StoredObjectInfo(long Size, string? ContentType, string? ETag, DateTime? LastModifiedUtc);

public record MinioObjectInfo(string Key, ulong Size, string ETag, DateTime? LastModifiedUtc = null);
