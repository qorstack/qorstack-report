using System.Net.Mime;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Net.Http.Headers;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Utilities;
using QorstackReportService.Infrastructure.Services.Storage;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

/// <summary>
/// Download links for stored files (generated reports, template previews, fonts, builder assets).
/// The token in the URL is HMAC-signed by the API and expires, so the endpoint is anonymous and
/// storage (RustFS / MinIO / S3) never has to be reachable from the browser.
/// </summary>
public class Files : EndpointGroupBase
{
    private static readonly FileExtensionContentTypeProvider ContentTypes = new();

    public override void Map(IEndpointRouteBuilder app)
    {
        app.MapMethods("/files/{token}", [HttpMethods.Get, HttpMethods.Head], GetFile)
            .WithTags("Files")
            .AllowAnonymous()
            .ExcludeFromDescription();
    }

    public async Task GetFile(
        string token,
        HttpContext http,
        FileUrlSigner signer,
        IMinioStorageService storage)
    {
        var response = http.Response;
        if (!signer.TryRead(token, DateTimeOffset.UtcNow, out var file) || file is null)
        {
            response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        // Metadata first (size for Content-Length / Range). Unreachable storage → StorageUnavailableException → 503.
        var info = await storage.StatAsync(file.Area, file.Key, http.RequestAborted);
        if (info is null)
        {
            response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        var name = file.FileName ?? Path.GetFileName(file.Key);
        if (!ContentTypes.TryGetContentType(name, out var contentType))
            contentType = info.ContentType ?? MediaTypeNames.Application.Octet;

        // A requested download name → attachment; otherwise inline so previews (PDF viewer, <img>) render.
        var disposition = new ContentDispositionHeaderValue(file.FileName != null ? "attachment" : "inline");
        disposition.SetHttpFileName(name);
        response.Headers[HeaderNames.ContentDisposition] = disposition.ToString();
        response.Headers[HeaderNames.CacheControl] = "private, max-age=300";
        response.Headers[HeaderNames.AcceptRanges] = "bytes";
        response.Headers["X-Content-Type-Options"] = "nosniff";
        if (!string.IsNullOrEmpty(info.ETag)) response.Headers[HeaderNames.ETag] = $"\"{info.ETag}\"";
        if (info.LastModifiedUtc is { } modified) response.Headers[HeaderNames.LastModified] = modified.ToString("R");
        response.ContentType = contentType;

        var range = ByteRange.Parse(http.Request.Headers[HeaderNames.Range], info.Size, out var start, out var end);
        if (range == ByteRangeResult.NotSatisfiable)
        {
            response.StatusCode = StatusCodes.Status416RangeNotSatisfiable;
            response.Headers[HeaderNames.ContentRange] = $"bytes */{info.Size}";
            return;
        }

        var length = end - start + 1;
        if (range == ByteRangeResult.Partial)
        {
            response.StatusCode = StatusCodes.Status206PartialContent;
            response.Headers[HeaderNames.ContentRange] = $"bytes {start}-{end}/{info.Size}";
        }
        response.ContentLength = info.Size == 0 ? 0 : length;

        if (HttpMethods.IsHead(http.Request.Method) || info.Size == 0) return;

        // Stream straight from storage into the response — the file is never held in memory.
        await storage.CopyToAsync(file.Area, file.Key, response.Body,
            range == ByteRangeResult.Partial ? start : 0,
            range == ByteRangeResult.Partial ? length : null,
            http.RequestAborted);
    }
}
