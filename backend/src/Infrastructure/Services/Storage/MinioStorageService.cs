using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel;
using Minio.DataModel.Args;
using Minio.DataModel.ILM;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services.Storage;

/// <summary>
/// MinIO storage service implementation
/// </summary>
public class MinioStorageService : IMinioStorageService
{
    private readonly IMinioClient _minioClient;
    private readonly IMinioClient _signingClient;
    private readonly MinioSettings _settings;
    private readonly ILogger<MinioStorageService> _logger;
    private readonly ConcurrentDictionary<string, bool> _knownBuckets = new();

    public MinioStorageService(
        IOptions<MinioSettings> settings,
        ILogger<MinioStorageService> logger)
    {
        _settings = settings.Value;
        _logger = logger;

        // 1. Initialize Internal Client (for direct data access)
        // MinIO SDK expects endpoint without protocol prefix (e.g., "host:port")
        var endpoint = _settings.Endpoint
            .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
            .Replace("http://", "", StringComparison.OrdinalIgnoreCase);

        _minioClient = new MinioClient()
            .WithEndpoint(endpoint)
            .WithCredentials(_settings.AccessKey, _settings.SecretKey)
            .WithSSL(_settings.UseSsl)
            .Build();

        _logger.LogInformation("MinIO internal client initialized with endpoint: {Endpoint}, SSL: {UseSsl}", endpoint, _settings.UseSsl);

        // 2. Initialize Signing Client (for generating presigned URLs with public endpoint)
        if (!string.IsNullOrEmpty(_settings.PublicEndpoint))
        {
            try
            {
                var uri = new Uri(_settings.PublicEndpoint);
                var publicEndpoint = uri.Authority; // host:port
                var usePublicSsl = uri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase);

                _signingClient = new MinioClient()
                    .WithEndpoint(publicEndpoint)
                    .WithCredentials(_settings.AccessKey, _settings.SecretKey)
                    .WithSSL(usePublicSsl)
                    .Build();

                _logger.LogInformation("MinIO signing client initialized with public endpoint: {Endpoint}, SSL: {UseSsl}", publicEndpoint, usePublicSsl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize signing client with public endpoint. Falling back to internal client.");
                _signingClient = _minioClient;
            }
        }
        else
        {
            _signingClient = _minioClient;
        }
    }

    /// <inheritdoc />
    public async Task<string> UploadFileAsync(string bucketName, string objectName, Stream data, string contentType)
    {
        try
        {
            await EnsureBucketExistsAsync(bucketName);

            var putObjectArgs = new PutObjectArgs()
                .WithBucket(bucketName)
                .WithObject(objectName)
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
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<Stream> DownloadFileAsync(string bucketName, string objectName)
    {
        try
        {
            var memoryStream = new MemoryStream();

            var getObjectArgs = new GetObjectArgs()
                .WithBucket(bucketName)
                .WithObject(objectName)
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
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<string> GetPresignedUrlAsync(string bucketName, string objectName, int expirySeconds = 3600)
    {
        try
        {
            var presignedGetObjectArgs = new PresignedGetObjectArgs()
                .WithBucket(bucketName)
                .WithObject(objectName)
                .WithExpiry(expirySeconds);

            // Use the signing client (configured with public endpoint if available)
            // This ensures the signature is generated using the correct host header (public domain)
            // preventing 403 SignatureDoesNotMatch errors when accessed from the browser.
            var url = await _signingClient.PresignedGetObjectAsync(presignedGetObjectArgs);

            _logger.LogInformation("Generated presigned URL for {ObjectName} in bucket {BucketName}, expires in {ExpirySeconds}s",
                objectName, bucketName, expirySeconds);
            return url;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate presigned URL for {ObjectName} in bucket {BucketName}", objectName, bucketName);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task DeleteFileAsync(string bucketName, string objectName)
    {
        try
        {
            var removeObjectArgs = new RemoveObjectArgs()
                .WithBucket(bucketName)
                .WithObject(objectName);

            await _minioClient.RemoveObjectAsync(removeObjectArgs);

            _logger.LogInformation("Successfully deleted {ObjectName} from bucket {BucketName}", objectName, bucketName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete {ObjectName} from bucket {BucketName}", objectName, bucketName);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<bool> FileExistsAsync(string bucketName, string objectName)
    {
        try
        {
            var statObjectArgs = new StatObjectArgs()
                .WithBucket(bucketName)
                .WithObject(objectName);

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
            throw;
        }
    }

    /// <inheritdoc />
    public async Task EnsureBucketExistsAsync(string bucketName)
    {
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
            throw;
        }
    }

    /// <inheritdoc />
    public async Task SetBucketLifecycleAsync(string bucketName, int days, string prefix = "")
    {
        try
        {
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
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<MinioObjectInfo>> ListObjectsAsync(string bucketName, string? prefix = null)
    {
        try
        {
            var result = new List<MinioObjectInfo>();
            var args = new ListObjectsArgs()
                .WithBucket(bucketName)
                .WithRecursive(true);
            if (prefix != null)
                args = args.WithPrefix(prefix);

            await foreach (var item in _minioClient.ListObjectsEnumAsync(args))
                result.Add(new MinioObjectInfo(item.Key, item.Size, item.ETag.Trim('"')));

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list objects in bucket {BucketName}", bucketName);
            throw;
        }
    }

    /// <inheritdoc />
    public string? TryConvertToMinioPath(string url)
    {
        if (string.IsNullOrEmpty(url)) return null;

        // Only process URLs that look like presigned MinIO URLs (contain X-Amz- query params)
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

            return $"minio:{path}";
        }
        catch
        {
            return null;
        }
    }
}
