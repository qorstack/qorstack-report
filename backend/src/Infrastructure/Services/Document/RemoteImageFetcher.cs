using System.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using QorstackReportService.Infrastructure.Services.Http;
using QorstackReportService.Infrastructure.Services.Storage;

namespace QorstackReportService.Infrastructure.Services.Document;

/// <summary>
/// Downloads images referenced by URL in render requests (<c>image[].src</c>, QR logos) without
/// letting callers reach the server's own network (SSRF).
/// <list type="bullet">
/// <item>http/https only.</item>
/// <item>Connections go through <see cref="SafeHttp"/>: private / internal addresses are refused, also after redirects.</item>
/// <item>Size and time limits so one request cannot exhaust memory or hold a worker.</item>
/// </list>
/// Images on this deployment's own storage server (STORAGE_ENDPOINT / STORAGE_PUBLIC_ENDPOINT) are always allowed.
/// Self-hosters who keep images on another intranet server can set <c>ImageFetch:AllowPrivateNetworks=true</c>.
/// </summary>
public static class RemoteImageFetcher
{
    public const string HttpClientName = "remote-image";
    public const long MaxBytes = 20 * 1024 * 1024; // 20 MB per image
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(15);
    private const int MaxRedirects = 3;

    public static IServiceCollection AddRemoteImageFetcher(this IServiceCollection services, IConfiguration configuration)
    {
        var allowPrivate = configuration.GetValue("ImageFetch:AllowPrivateNetworks", false);
        var storage = new StorageSettings();
        StorageSettings.Bind(storage, configuration);
        var trustedHosts = StorageHosts.Trusted(storage);

        services.AddHttpClient(HttpClientName, client =>
            {
                client.Timeout = Timeout;
                client.MaxResponseContentBufferSize = MaxBytes;
                client.DefaultRequestHeaders.UserAgent.ParseAdd("QorstackReport/2 (+https://github.com/qorstack/qorstack-report)");
            })
            .ConfigurePrimaryHttpMessageHandler(() => SafeHttp.CreateHandler(allowPrivate, MaxRedirects, trustedHosts));

        return services;
    }

    /// <summary>Downloads an http(s) image, enforcing the scheme and the size limit.</summary>
    public static async Task<byte[]> DownloadAsync(IHttpClientFactory factory, string url, CancellationToken ct)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            throw new ArgumentException("Image URL must be an absolute http(s) URL.");

        var client = factory.CreateClient(HttpClientName);
        using var response = await client.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();
        if (response.Content.Headers.ContentLength is > MaxBytes)
            throw new ArgumentException($"Image is larger than {MaxBytes / (1024 * 1024)} MB.");

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await stream.ReadAsync(chunk, ct)) > 0)
        {
            if (buffer.Length + read > MaxBytes)
                throw new ArgumentException($"Image is larger than {MaxBytes / (1024 * 1024)} MB.");
            buffer.Write(chunk, 0, read);
        }
        return buffer.ToArray();
    }

    /// <summary>True for addresses a public image URL must never reach.</summary>
    public static bool IsBlocked(IPAddress address) => SafeHttp.IsBlocked(address);
}
