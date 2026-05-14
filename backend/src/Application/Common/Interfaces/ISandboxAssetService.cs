using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Shared service for handling sandbox image/logo assets:
/// base64 → MinIO upload, presigned URL → minio: path normalization,
/// image optimization. Used by both PDF and Excel render handlers.
/// </summary>
public interface ISandboxAssetService
{
    /// <summary>
    /// Converts any presigned URLs in the payload (image src, QR logo) back to
    /// minio: paths. Safe to call whether the payload has fresh URLs or not.
    /// </summary>
    void ConvertPresignedUrlsToMinioPaths(DocumentProcessingData data);

    /// <summary>
    /// Uploads any base64-encoded images / QR logos in the payload to MinIO.
    /// Replaces the base64 string with a minio: path. Images are optimized
    /// (resized + re-encoded) before upload to reduce storage and render cost.
    /// </summary>
    /// <param name="prefix">Object key prefix (e.g. sandbox-assets/{userId}/{templateId})</param>
    Task ReplaceBase64WithMinioUrlsAsync(DocumentProcessingData data, string prefix);
}
