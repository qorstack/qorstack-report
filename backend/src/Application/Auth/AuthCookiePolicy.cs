namespace QorstackReportService.Application.Auth;

/// <summary>
/// How the login cookies (accessToken / refreshToken) are flagged. No setup needed:
/// <list type="bullet">
/// <item>The address the BROWSER is on decides, read from the request's <c>Origin</c> (or <c>Referer</c>) header:
/// https:// → Secure + SameSite=None; http:// (a Kubernetes NodePort, an intranet IP, localhost) → not Secure,
/// SameSite=Lax. Browsers drop Secure cookies on http://, so this is what lets plain-HTTP installs sign in.
/// It works behind any number of proxies, unlike the connection's own scheme or X-Forwarded-Proto.</item>
/// <item>No such header (API clients, curl): Secure except plain-HTTP localhost, as before.</item>
/// <item><c>AUTH_COOKIE_SECURE=true|false</c> forces one or the other.</item>
/// </list>
/// The web UI and API share one origin, so Lax is enough for it; None is kept for HTTPS because it lets a
/// browser app on another origin call the API with the cookie.
/// </summary>
public static class AuthCookiePolicy
{
    public const string ConfigKey = "Auth:CookieSecure";

    /// <param name="configured">Value of <see cref="ConfigKey"/>; null when not set.</param>
    /// <param name="browserHttps">Scheme of the page that sent the request (Origin / Referer); null when unknown.</param>
    /// <param name="isLocalhost">Request host is localhost / 127.0.0.1.</param>
    /// <param name="isHttps">The connection to this server is HTTPS.</param>
    public static (bool Secure, bool SameSiteLax) Resolve(bool? configured, bool? browserHttps, bool isLocalhost, bool isHttps) =>
        (configured ?? browserHttps) switch
        {
            true => (true, false),
            false => (false, true),
            null => (!isLocalhost || isHttps, isLocalhost && !isHttps)
        };

    /// <summary>Reads the setting: "true"/"false" (any case), anything else or empty = not set.</summary>
    public static bool? Parse(string? value) => bool.TryParse(value?.Trim(), out var b) ? b : null;

    /// <summary>
    /// Whether the browser page is on https, from the Origin header, else the Referer. Null when neither is an
    /// absolute http(s) URL (e.g. "null" origins, missing headers).
    /// </summary>
    public static bool? BrowserIsHttps(string? origin, string? referer)
    {
        foreach (var value in new[] { origin, referer })
        {
            if (Uri.TryCreate(value?.Trim(), UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp))
                return uri.Scheme == Uri.UriSchemeHttps;
        }
        return null;
    }
}
