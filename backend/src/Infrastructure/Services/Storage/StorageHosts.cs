namespace QorstackReportService.Infrastructure.Services.Storage;

/// <summary>
/// Addresses of this deployment's own storage server, from <see cref="StorageSettings"/>: the internal
/// <c>Endpoint</c> and the optional browser-facing <c>PublicEndpoint</c>.
/// </summary>
public static class StorageHosts
{
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
