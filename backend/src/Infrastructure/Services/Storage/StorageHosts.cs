namespace QorstackReportService.Infrastructure.Services.Storage;

/// <summary>
/// Addresses of this deployment's own storage server, from <see cref="StorageSettings"/>: the internal
/// <c>Endpoint</c> and the optional browser-facing <c>PublicEndpoint</c>.
/// </summary>
public static class StorageHosts
{
    /// <summary>
    /// "host:port" of both storage addresses (lower case; default port 80/443 from the scheme or UseSsl).
    /// Image URLs pointing at these hosts are this deployment's own files (for example presigned links an app
    /// issued for the same MinIO), so the image fetcher may reach them even on a private network.
    /// </summary>
    public static HashSet<string> Trusted(StorageSettings settings)
    {
        var hosts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (TryParse(settings.Endpoint, settings.UseSsl, out var internalHost)) hosts.Add(internalHost);
        if (TryParse(settings.PublicEndpoint, settings.UseSsl, out var publicHost)) hosts.Add(publicHost);
        return hosts;
    }

    /// <summary>The public endpoint as an absolute http(s) URI, or null when not set / not a URL.</summary>
    public static Uri? PublicEndpointUri(StorageSettings settings)
    {
        var value = settings.PublicEndpoint?.Trim();
        if (string.IsNullOrEmpty(value)) return null;
        if (!value.Contains("://", StringComparison.Ordinal)) value = (settings.UseSsl ? "https://" : "http://") + value;
        return Uri.TryCreate(value, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
            ? uri
            : null;
    }

    /// <summary>"host:port" for an endpoint written as a URL or as host[:port].</summary>
    public static bool TryParse(string? endpoint, bool useSsl, out string hostPort)
    {
        hostPort = string.Empty;
        var value = endpoint?.Trim();
        if (string.IsNullOrEmpty(value)) return false;
        if (!value.Contains("://", StringComparison.Ordinal)) value = (useSsl ? "https://" : "http://") + value;
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || string.IsNullOrEmpty(uri.Host)) return false;
        hostPort = $"{uri.Host.ToLowerInvariant()}:{uri.Port}";
        return true;
    }
}
