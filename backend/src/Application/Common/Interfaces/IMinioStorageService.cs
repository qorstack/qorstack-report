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
    /// Generates a presigned URL for temporary access to a file
    /// </summary>
    /// <param name="bucketName">The name of the bucket</param>
    /// <param name="objectName">The object name/path in the bucket</param>
    /// <param name="expirySeconds">URL expiry time in seconds (default: 3600)</param>
    /// <returns>A presigned URL for downloading the file</returns>
    Task<string> GetPresignedUrlAsync(string bucketName, string objectName, int expirySeconds = 3600);

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
    /// Tries to convert a presigned URL back to a "minio:{bucket}/{objectName}" path.
    /// Returns null if the URL is not a recognized MinIO presigned URL.
    /// </summary>
    /// <param name="url">The presigned URL to convert</param>
    /// <returns>The minio: path if recognized, null otherwise</returns>
    string? TryConvertToMinioPath(string url);

    /// <summary>
    /// Lists all objects in the specified bucket with optional prefix filter.
    /// </summary>
    Task<IReadOnlyList<MinioObjectInfo>> ListObjectsAsync(string bucketName, string? prefix = null);
}

public record MinioObjectInfo(string Key, ulong Size, string ETag);
