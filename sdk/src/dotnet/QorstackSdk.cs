namespace Qorstack.Report.Sdk;

using System.Net.Http;

/// <summary>
/// Qorstack API Client
/// </summary>
public partial class QorstackApi
{
    private string? _apiKey;

    /// <summary>
    /// Initializes a new instance of the <see cref="QorstackApi"/> class.
    /// </summary>
    /// <param name="baseUrl">The base URL of the API. If null, defaults to QORSTACK_API_URL or RENDOX_API_URL, then falls back to http://localhost:8080.</param>
    /// <param name="apiKey">The API Key for authentication.</param>
    public QorstackApi(string? baseUrl = null, string? apiKey = null) : this(baseUrl!, new HttpClient())
    {
        _apiKey = apiKey;
    }

    /// <summary>
    /// Sets the API Key for authentication.
    /// </summary>
    /// <param name="apiKey">The API Key.</param>
    public void SetSecurityData(string apiKey)
    {
        _apiKey = apiKey;
    }

    /// <summary>
    /// Called after the constructor has initialized the client.
    /// Sets the BaseUrl from environment variable or default if not provided.
    /// </summary>
    partial void Initialize()
    {
        if (string.IsNullOrEmpty(BaseUrl))
        {
            var envUrl = Environment.GetEnvironmentVariable("QORSTACK_API_URL")
                ?? Environment.GetEnvironmentVariable("RENDOX_API_URL");
            if (!string.IsNullOrEmpty(envUrl))
            {
                BaseUrl = envUrl;
            }
            else
            {
                BaseUrl = "http://localhost:8080/api";
            }
        }

        // Since v2 the API lives under /api (same port as the web UI); append it to v1-style URLs.
        var trimmed = BaseUrl.TrimEnd('/');
        if (!trimmed.EndsWith("/api", StringComparison.OrdinalIgnoreCase))
            BaseUrl = trimmed + "/api";
    }

    /// <summary>
    /// Called before sending the request.
    /// Adds the X-API-KEY header if available.
    /// </summary>
    partial void PrepareRequest(System.Net.Http.HttpClient client, System.Net.Http.HttpRequestMessage request, string url)
    {
        if (!string.IsNullOrEmpty(_apiKey) && !request.Headers.Contains("X-API-KEY"))
        {
            request.Headers.Add("X-API-KEY", _apiKey);
        }
    }
}
