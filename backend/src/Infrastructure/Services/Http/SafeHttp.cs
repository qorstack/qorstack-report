using System.Net;
using System.Net.Sockets;

namespace QorstackReportService.Infrastructure.Services.Http;

/// <summary>
/// Outbound HTTP to user-supplied URLs (image sources, webhooks) without letting callers reach the server's own
/// network (SSRF). Every connection — including redirects — is checked at connect time against the resolved IP,
/// so DNS tricks cannot slip through: loopback, private (RFC 1918 / ULA), link-local (incl. cloud metadata
/// 169.254.169.254), CGNAT, multicast and unspecified addresses are refused unless <c>allowPrivate</c> is set.
/// <c>trustedHosts</c> ("host:port") are always allowed: this deployment's own storage server.
/// </summary>
public static class SafeHttp
{
    public static SocketsHttpHandler CreateHandler(bool allowPrivate, int maxRedirects, IReadOnlySet<string>? trustedHosts = null) => new()
    {
        AllowAutoRedirect = maxRedirects > 0,
        MaxAutomaticRedirections = Math.Max(1, maxRedirects),
        UseProxy = false,
        ConnectCallback = (ctx, ct) => ConnectAsync(ctx, allowPrivate || IsTrusted(ctx.DnsEndPoint.Host, ctx.DnsEndPoint.Port, trustedHosts), ct)
    };

    /// <summary>True when host:port is one of the trusted addresses (case-insensitive host).</summary>
    public static bool IsTrusted(string host, int port, IReadOnlySet<string>? trustedHosts) =>
        trustedHosts is { Count: > 0 } && trustedHosts.Contains($"{host.ToLowerInvariant()}:{port}");

    public static bool IsHttpUrl(string? url, out Uri uri)
    {
        uri = null!;
        return Uri.TryCreate(url, UriKind.Absolute, out var parsed)
               && (parsed.Scheme == Uri.UriSchemeHttp || parsed.Scheme == Uri.UriSchemeHttps)
               && (uri = parsed) != null;
    }

    private static async ValueTask<Stream> ConnectAsync(SocketsHttpConnectionContext ctx, bool allowPrivate, CancellationToken ct)
    {
        var addresses = await Dns.GetHostAddressesAsync(ctx.DnsEndPoint.Host, ct);
        var allowed = allowPrivate ? addresses : addresses.Where(a => !IsBlocked(a)).ToArray();
        if (allowed.Length == 0)
            throw new HttpRequestException($"Host '{ctx.DnsEndPoint.Host}' resolves to a private or reserved address, which is not allowed.");

        var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
        try
        {
            await socket.ConnectAsync(allowed, ctx.DnsEndPoint.Port, ct);
            return new NetworkStream(socket, ownsSocket: true);
        }
        catch
        {
            socket.Dispose();
            throw;
        }
    }

    /// <summary>True for addresses a user-supplied URL must never reach.</summary>
    public static bool IsBlocked(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        if (IPAddress.IsLoopback(address) || address.Equals(IPAddress.Any) || address.Equals(IPAddress.IPv6Any)
            || address.Equals(IPAddress.Broadcast) || address.Equals(IPAddress.None)) return true;

        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = address.GetAddressBytes();
            return b[0] == 0                                   // 0.0.0.0/8
                || b[0] == 10                                  // 10.0.0.0/8
                || (b[0] == 100 && b[1] >= 64 && b[1] <= 127)  // 100.64.0.0/10 CGNAT (incl. Tailscale)
                || b[0] == 127                                 // loopback
                || (b[0] == 169 && b[1] == 254)                // link-local, cloud metadata
                || (b[0] == 172 && b[1] >= 16 && b[1] <= 31)   // 172.16.0.0/12
                || (b[0] == 192 && b[1] == 168)                // 192.168.0.0/16
                || (b[0] == 192 && b[1] == 0 && b[2] == 0)     // 192.0.0.0/24
                || (b[0] == 198 && (b[1] == 18 || b[1] == 19)) // benchmarking
                || b[0] >= 224;                                // multicast + reserved
        }

        if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            var b = address.GetAddressBytes();
            return address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || address.IsIPv6Multicast
                || (b[0] & 0xFE) == 0xFC;                      // fc00::/7 unique local
        }

        return true;
    }
}
