using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel;
using Minio.DataModel.Args;
using Minio.DataModel.ILM;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services.Storage;

/// <summary>
/// S3 storage service (RustFS, MinIO, AWS S3, R2, ...) using the MinIO .NET SDK with standard S3 calls only.
/// Callers pass a logical area (<see cref="StorageAreas"/>) as the "bucket"; this service stores everything in the
/// single physical bucket <see cref="StorageSettings.Bucket"/> under the area's folder
/// (e.g. area "templates", key "a/b.docx" → bucket "qorstack-report", object "template/a/b.docx").
/// Stored paths keep the logical form <c>minio:{area}/{key}</c>.
/// </summary>
public class MinioStorageService : IMinioStorageService
{
    private readonly IMinioClient _minioClient;
    private readonly FileUrlSigner _fileUrls;
    private readonly StorageSettings _settings;
    private readonly ILogger<MinioStorageService> _logger;
    private readonly ConcurrentDictionary<string, bool> _knownBuckets = new();
    /// <summary>Signs download links for <see cref="StorageSettings.PublicEndpoint"/>; null = links go through the API.</summary>
    private readonly IMinioClient? _publicClient;

    public MinioStorageService(
        IOptions<StorageSettings> settings,
        FileUrlSigner fileUrls,
        ILogger<MinioStorageService> logger)
    {
        _settings = settings.Value;
        _fileUrls = fileUrls;
        _logger = logger;

        // The MinIO .NET SDK speaks plain S3, so this works with RustFS, MinIO, AWS S3, R2, ...
        // It expects host:port without a scheme.
        var endpoint = _settings.Endpoint
            .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
            .Replace("http://", "", StringComparison.OrdinalIgnoreCase);

        _minioClient = new MinioClient()
            .WithEndpoint(endpoint)
            .WithCredentials(_settings.AccessKey, _settings.SecretKey)
            .WithSSL(_settings.UseSsl)
            .WithRegion(_settings.Region)
            .Build();

        _logger.LogInformation("Storage client initialized with endpoint: {Endpoint}, SSL: {UseSsl}", endpoint, _settings.UseSsl);

        // STORAGE_PUBLIC_ENDPOINT set → download links are presigned for that address (browsers fetch from storage
        // directly, as in v1). The signature covers the host, so this client is configured with the public address;
        // it is only used to sign (no network call: the region is fixed).
        var publicUri = StorageHosts.PublicEndpointUri(_settings);
        if (publicUri != null)
        {
            _publicClient = new MinioClient()
                .WithEndpoint(publicUri.Authority)
                .WithCredentials(_settings.AccessKey, _settings.SecretKey)
                .WithSSL(publicUri.Scheme == Uri.UriSchemeHttps)
                .WithRegion(_settings.Region)
                .Build();
            _logger.LogInformation("Download links are presigned for the public storage endpoint {PublicEndpoint}", publicUri.GetLeftPart(UriPartial.Authority));
        }
    }

    /// <summary>Maps a logical area + key to the physical bucket + object key.</summary>
    private (string Bucket, string Key) Locate(string area, string objectName)
    {
        if (StorageAreas.Folders.TryGetValue(area, out var folder))
            return (_settings.Bucket, folder + objectName);
        // Never pass an unknown name through as a bucket: on a shared MinIO that would expose other apps' data.
        throw new ArgumentException($"Unknown storage area '{area}'.");
    }

    /// <inheritdoc />
    public async Task<string> UploadFileAsync(string bucketName, string objectName, Stream data, string contentType)
    {
        try
        {
            await EnsureBucketExistsAsync(bucketName);
            var (bucket, key) = Locate(bucketName, objectName);

            var putObjectArgs = new PutObjectArgs()
                .WithBucket(bucket)
                .WithObject(key)
                .WithStreamData(data)
                .WithObjectSize(data.Length)
                .WithContentType(contentType);

            await _minioClient.PutObjectAsync(putObjectArgs);

            _logger.LogDebug("Successfully uploaded {ObjectName} to bucket {BucketName}", objectName, bucketName);
            return objectName;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload {ObjectName} to bucket {BucketName}", objectName, bucketName);
            if (IsUnreachable(ex)) throw new StorageUnavailableException(_settings.Endpoint);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<Stream> DownloadFileAsync(string bucketName, string objectName)
    {
        try
        {
            var memoryStream = new MemoryStream();
            var (bucket, key) = Locate(bucketName, objectName);

            var getObjectArgs = new GetObjectArgs()
                .WithBucket(bucket)
                .WithObject(key)
                .WithCallbackStream(stream =>
                {
                    stream.CopyTo(memoryStream);
                });

            await _minioClient.GetObjectAsync(getObjectArgs);
            memoryStream.Position = 0;

            _logger.LogDebug("Successfully downloaded {ObjectName} from bucket {BucketName}", objectName, bucketName);
            return memoryStream;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download {ObjectName} from bucket {BucketName}", objectName, bucketName);
            if (IsUnreachable(ex)) throw new StorageUnavailableException(_settings.Endpoint);
            throw;
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Default: an API link (<c>{PublicUrl}/api/files/{token}</c>), so the storage server never needs a public
    /// address; the token is HMAC-signed and expires after <paramref name="expirySeconds"/>.
    /// With <see cref="StorageSettings.PublicEndpoint"/> set: an S3 presigned URL for that address instead
    /// (browsers download from storage directly; PUBLIC_URL is then not needed for downloads).
    /// </remarks>
    public async Task<string> GetPresignedUrlAsync(string bucketName, string objectName, int expirySeconds = 3600, string? downloadFileName = null)
    {
        var (bucket, key) = Locate(bucketName, objectName); // validates the area
        var fileName = string.IsNullOrWhiteSpace(downloadFileName) ? null : SanitizeDownloadFileName(downloadFileName);

        if (_publicClient == null)
        {
            var token = _fileUrls.CreateToken(bucketName, objectName, fileName, DateTimeOffset.UtcNow.AddSeconds(expirySeconds));
            return _fileUrls.BuildUrl(token);
        }

        var args = new PresignedGetObjectArgs()
            .WithBucket(bucket)
            .WithObject(key)
            .WithExpiry(Math.Clamp(expirySeconds, 1, 7 * 24 * 3600)); // S3 allows at most 7 days
        if (fileName != null)
        {
            // Saved file name, independent of the object key (same as the API link's Content-Disposition).
            args = args.WithHeaders(new Dictionary<string, string>
            {
                ["response-content-disposition"] = ContentDispositionAttachment(fileName)
            });
        }
        return await _publicClient.PresignedGetObjectAsync(args);
    }

    /// <summary>attachment; filename="ascii fallback"; filename*=UTF-8''percent-encoded (Thai names survive).</summary>
    public static string ContentDispositionAttachment(string fileName)
    {
        var ascii = new string(fileName.Select(c => c is >= ' ' and <= '~' && c != '"' && c != '\\' ? c : '_').ToArray());
        return $"attachment; filename=\"{ascii}\"; filename*=UTF-8''{Uri.EscapeDataString(fileName)}";
    }

    /// <inheritdoc />
    public async Task DeleteFileAsync(string bucketName, string objectName)
    {
        try
        {
            var (bucket, key) = Locate(bucketName, objectName);
            var removeObjectArgs = new RemoveObjectArgs()
                .WithBucket(bucket)
                .WithObject(key);

            await _minioClient.RemoveObjectAsync(removeObjectArgs);

            _logger.LogDebug("Successfully deleted {ObjectName} from bucket {BucketName}", objectName, bucketName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete {ObjectName} from bucket {BucketName}", objectName, bucketName);
            if (IsUnreachable(ex)) throw new StorageUnavailableException(_settings.Endpoint);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<StoredObjectInfo?> StatAsync(string bucketName, string objectName, CancellationToken cancellationToken = default)
    {
        var (bucket, key) = Locate(bucketName, objectName);
        try
        {
            var stat = await _minioClient.StatObjectAsync(new StatObjectArgs().WithBucket(bucket).WithObject(key), cancellationToken);
            return new StoredObjectInfo(stat.Size, stat.ContentType, stat.ETag?.Trim('"'),
                stat.LastModified == default ? null : stat.LastModified.ToUniversalTime());
        }
        catch (Minio.Exceptions.ObjectNotFoundException)
        {
            return null;
        }
        catch (Minio.Exceptions.BucketNotFoundException)
        {
            return null;
        }
        catch (Exception ex) when (IsUnreachable(ex))
        {
            _logger.LogError(ex, "File storage unreachable at {Endpoint}", _settings.Endpoint);
            throw new StorageUnavailableException(_settings.Endpoint);
        }
    }

    /// <inheritdoc />
    public async Task CopyToAsync(string bucketName, string objectName, Stream destination, long offset = 0, long? length = null, CancellationToken cancellationToken = default)
    {
        var (bucket, key) = Locate(bucketName, objectName);
        var args = new GetObjectArgs()
            .WithBucket(bucket)
            .WithObject(key)
            .WithCallbackStream(async (stream, ct) => await stream.CopyToAsync(destination, 81920, ct));
        if (offset > 0 || length.HasValue)
            args = args.WithOffsetAndLength(offset, length ?? 0);

        try
        {
            await _minioClient.GetObjectAsync(args, cancellationToken);
        }
        catch (Exception ex) when (IsUnreachable(ex))
        {
            _logger.LogError(ex, "File storage unreachable at {Endpoint}", _settings.Endpoint);
            throw new StorageUnavailableException(_settings.Endpoint);
        }
    }

    /// <inheritdoc />
    public async Task<bool> IsReachableAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await _minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(_settings.Bucket), cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "File storage not reachable at {Endpoint}", _settings.Endpoint);
            return false;
        }
    }

    /// <summary>Connection-level failures (DNS, refused, timeout) — not "object missing" or "access denied".</summary>
    internal static bool IsUnreachable(Exception ex)
    {
        for (var e = ex; e != null; e = e.InnerException)
        {
            if (e is Minio.Exceptions.ConnectionException or HttpRequestException or System.Net.Sockets.SocketException or TimeoutException)
                return true;
        }
        return false;
    }

    /// <inheritdoc />
    public async Task<bool> FileExistsAsync(string bucketName, string objectName)
    {
        try
        {
            var (bucket, key) = Locate(bucketName, objectName);
            var statObjectArgs = new StatObjectArgs()
                .WithBucket(bucket)
                .WithObject(key);

            await _minioClient.StatObjectAsync(statObjectArgs);
            return true;
        }
        catch (Minio.Exceptions.ObjectNotFoundException)
        {
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check existence of {ObjectName} in bucket {BucketName}", objectName, bucketName);
            if (IsUnreachable(ex)) throw new StorageUnavailableException(_settings.Endpoint);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task EnsureBucketExistsAsync(string bucketName)
    {
        bucketName = Locate(bucketName, string.Empty).Bucket;
        if (_knownBuckets.ContainsKey(bucketName)) return;

        try
        {
            var bucketExistsArgs = new BucketExistsArgs()
                .WithBucket(bucketName);

            bool found = await _minioClient.BucketExistsAsync(bucketExistsArgs);

            if (!found)
            {
                var makeBucketArgs = new MakeBucketArgs()
                    .WithBucket(bucketName);

                await _minioClient.MakeBucketAsync(makeBucketArgs);
                _logger.LogInformation("Created bucket {BucketName}", bucketName);
            }

            _knownBuckets[bucketName] = true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to ensure bucket {BucketName} exists", bucketName);
            if (IsUnreachable(ex)) throw new StorageUnavailableException(_settings.Endpoint);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task SetBucketLifecycleAsync(string bucketName, int days, string prefix = "")
    {
        try
        {
            (bucketName, prefix) = Locate(bucketName, prefix);
            var lifecycle = new LifecycleConfiguration { Rules = [] };
            var rule = new LifecycleRule
            {
                ID = $"Expire-{prefix.Replace("/", "-")}-{days}d",
                Status = "Enabled",
                Expiration = new Expiration { Days = days },
                Filter = new RuleFilter { Prefix = prefix }
            };

            lifecycle.Rules.Add(rule);

            var setLifecycleArgs = new SetBucketLifecycleArgs()
                .WithBucket(bucketName)
                .WithLifecycleConfiguration(lifecycle);

            await _minioClient.SetBucketLifecycleAsync(setLifecycleArgs);
            _logger.LogInformation("Set lifecycle for bucket {BucketName} with prefix '{Prefix}' to expire in {Days} days",
                bucketName, prefix, days);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set lifecycle for bucket {BucketName}", bucketName);
            if (IsUnreachable(ex)) throw new StorageUnavailableException(_settings.Endpoint);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<string> ResolveMinioPathAsync(string minioPath, int expirySeconds = 3600)
    {
        if (string.IsNullOrEmpty(minioPath) || !minioPath.StartsWith("minio:", StringComparison.OrdinalIgnoreCase))
        {
            return minioPath;
        }

        // Parse "minio:{bucket}/{objectName}"
        var path = minioPath[6..]; // Remove "minio:" prefix
        var slashIndex = path.IndexOf('/');
        if (slashIndex <= 0) return minioPath;

        var bucketName = path[..slashIndex];
        var objectName = path[(slashIndex + 1)..];

        return await GetPresignedUrlAsync(bucketName, objectName, expirySeconds);
    }

    /// <inheritdoc />
    public async Task DeleteByPrefixAsync(string bucketName, string prefix)
    {
        try
        {
            (bucketName, prefix) = Locate(bucketName, prefix);
            var listArgs = new ListObjectsArgs()
                .WithBucket(bucketName)
                .WithPrefix(prefix)
                .WithRecursive(true);

            var objects = new List<string>();
            await foreach (var item in _minioClient.ListObjectsEnumAsync(listArgs))
            {
                objects.Add(item.Key);
            }

            if (objects.Count == 0) return;

            var removeArgs = new RemoveObjectsArgs()
                .WithBucket(bucketName)
                .WithObjects(objects);

            await _minioClient.RemoveObjectsAsync(removeArgs);

            _logger.LogInformation("Deleted {Count} objects with prefix '{Prefix}' from bucket {BucketName}",
                objects.Count, prefix, bucketName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete objects with prefix '{Prefix}' from bucket {BucketName}", prefix, bucketName);
            if (IsUnreachable(ex)) throw new StorageUnavailableException(_settings.Endpoint);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<MinioObjectInfo>> ListObjectsAsync(string bucketName, string? prefix = null)
    {
        try
        {
            var result = new List<MinioObjectInfo>();
            var (bucket, folder) = Locate(bucketName, string.Empty);
            var args = new ListObjectsArgs()
                .WithBucket(bucket)
                .WithPrefix(folder + (prefix ?? string.Empty))
                .WithRecursive(true);

            // Return keys relative to the area so callers never see the folder.
            await foreach (var item in _minioClient.ListObjectsEnumAsync(args))
                result.Add(new MinioObjectInfo(item.Key[folder.Length..], item.Size, item.ETag.Trim('"'), item.LastModifiedDateTime));

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list objects in bucket {BucketName}", bucketName);
            if (IsUnreachable(ex)) throw new StorageUnavailableException(_settings.Endpoint);
            throw;
        }
    }

    /// <summary>
    /// Finds data left in the pre-v2 buckets (templates / reports / fonts) whose folder in
    /// <see cref="StorageSettings.Bucket"/> is still empty — i.e. the upgrade script was not run.
    /// Read-only: nothing is copied or deleted.
    /// </summary>
    public async Task<IReadOnlyList<string>> FindUnmigratedLegacyBucketsAsync(CancellationToken ct = default)
    {
        var found = new List<string>();
        foreach (var (area, folder) in StorageAreas.Folders)
        {
            if (area.Equals(_settings.Bucket, StringComparison.OrdinalIgnoreCase)) continue;
            if (!await _minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(area), ct)) continue;
            if (!await HasAnyObjectAsync(area, string.Empty, ct)) continue;
            if (await HasAnyObjectAsync(_settings.Bucket, folder, ct)) continue;
            found.Add(area);
        }
        return found;
    }

    private async Task<bool> HasAnyObjectAsync(string bucket, string prefix, CancellationToken ct)
    {
        if (!await _minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(bucket), ct)) return false;
        var args = new ListObjectsArgs().WithBucket(bucket).WithPrefix(prefix).WithRecursive(true);
        await foreach (var _ in _minioClient.ListObjectsEnumAsync(args, ct))
            return true;
        return false;
    }

    /// <summary>
    /// Strips characters that are unsafe inside a Content-Disposition filename
    /// (quotes, control chars, path separators) so the header stays well-formed.
    /// </summary>
    private static string SanitizeDownloadFileName(string fileName)
    {
        var cleaned = new string(fileName
            .Where(c => !char.IsControl(c) && c != '"' && c != '\\' && c != '/')
            .ToArray())
            .Trim();
        return string.IsNullOrEmpty(cleaned) ? "download" : cleaned;
    }

    /// <inheritdoc />
    public string? TryConvertToMinioPath(string url)
    {
        if (string.IsNullOrEmpty(url)) return null;

        // Links issued by this API (/files/{token}) → minio:{area}/{key}
        var fromFileLink = _fileUrls.TryConvertToStoragePath(url);
        if (fromFileLink != null) return fromFileLink;

        // Legacy (v1): presigned S3 URLs stored in old builder payloads (contain X-Amz- query params)
        if (!url.Contains("X-Amz-", StringComparison.OrdinalIgnoreCase)) return null;

        try
        {
            var uri = new Uri(url);
            var host = uri.Authority;

            // Check if the URL matches our internal or public MinIO endpoint
            var internalEndpoint = _settings.Endpoint
                .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
                .Replace("http://", "", StringComparison.OrdinalIgnoreCase);

            string? publicHost = null;
            if (!string.IsNullOrEmpty(_settings.PublicEndpoint))
            {
                try { publicHost = new Uri(_settings.PublicEndpoint).Authority; }
                catch { /* ignore */ }
            }

            if (!host.Equals(internalEndpoint, StringComparison.OrdinalIgnoreCase) &&
                (publicHost == null || !host.Equals(publicHost, StringComparison.OrdinalIgnoreCase)))
            {
                return null; // Not our MinIO server
            }

            // Extract bucket/objectName from path: /{bucket}/{objectName}
            var path = uri.AbsolutePath.TrimStart('/');
            if (string.IsNullOrEmpty(path)) return null;

            // Physical "{Bucket}/{folder}{key}" → logical "minio:{area}/{key}"
            var bucketPrefix = _settings.Bucket + "/";
            if (path.StartsWith(bucketPrefix, StringComparison.Ordinal))
            {
                var rest = path[bucketPrefix.Length..];
                foreach (var (area, folder) in StorageAreas.Folders)
                {
                    if (rest.StartsWith(folder, StringComparison.Ordinal))
                        return $"minio:{area}/{rest[folder.Length..]}";
                }
            }

            return $"minio:{path}";
        }
        catch
        {
            return null;
        }
    }
}
