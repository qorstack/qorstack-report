namespace QorstackReportService.Infrastructure.Services.Http;

/// <summary>
/// Outbound HTTP to URLs given in requests (image sources, QR logos, webhooks). Any address is allowed —
/// intranet hosts, private IPs and the storage server included — so images and webhooks on the internal network
/// just work. Only http/https URLs are accepted, redirects are capped, and callers set size/time limits.
/// </summary>
public static class SafeHttp
{
    public static SocketsHttpHandler CreateHandler(int maxRedirects) => new()
    {
        AllowAutoRedirect = maxRedirects > 0,
        MaxAutomaticRedirections = Math.Max(1, maxRedirects),
        UseProxy = false
    };

    public static bool IsHttpUrl(string? url, out Uri uri)
    {
        uri = null!;
        return Uri.TryCreate(url, UriKind.Absolute, out var parsed)
               && (parsed.Scheme == Uri.UriSchemeHttp || parsed.Scheme == Uri.UriSchemeHttps)
               && (uri = parsed) != null;
    }
}
