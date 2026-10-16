using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services.Storage;

/// <summary>What a <c>/files/{token}</c> link is allowed to read.</summary>
public sealed record FileToken(
    [property: JsonPropertyName("a")] string Area,
    [property: JsonPropertyName("k")] string Key,
    [property: JsonPropertyName("n")] string? FileName,
    [property: JsonPropertyName("e")] long ExpiresUnix);

/// <summary>
/// Signs and verifies download links served by the backend (<c>GET /files/{token}</c>), so storage
/// (RustFS, MinIO or any S3) never has to be reachable from the browser.
/// Token = base64url(JSON payload) + "." + base64url(HMAC-SHA256). The key is derived from <c>Jwt:Key</c>
/// (or <c>Files:SigningKey</c> when set), so no extra secret is required.
/// </summary>
public sealed class FileUrlSigner
{
    public const string RoutePrefix = "/api/files/";

    // v2.0 pre-release links were /files/{token}; "/files/" matches both forms when reading links back.
    private const string ParsePrefix = "/files/";

    private readonly byte[] _key;
    private readonly string? _publicUrl;
    private readonly IHttpContextAccessor? _http;

    public FileUrlSigner(IConfiguration configuration, IHttpContextAccessor? http = null)
        : this(configuration["Files:SigningKey"] ?? configuration["Jwt:Key"], configuration["App:PublicUrl"], http)
    {
    }

    public FileUrlSigner(string? secret, string? publicUrl, IHttpContextAccessor? http = null)
    {
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException("Jwt:Key (or Files:SigningKey) is required to sign download links.");
        // Derive a purpose-specific key so a file token can never double as a JWT signature.
        _key = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes("qorstack-files-v1"));
        _publicUrl = string.IsNullOrWhiteSpace(publicUrl) ? null : publicUrl.TrimEnd('/');
        _http = http;
    }

    public string CreateToken(string area, string key, string? fileName, DateTimeOffset expires)
    {
        var payload = JsonSerializer.SerializeToUtf8Bytes(new FileToken(area, key, fileName, expires.ToUnixTimeSeconds()));
        var body = Base64Url(payload);
        return $"{body}.{Base64Url(Sign(body))}";
    }

    public bool TryRead(string? token, DateTimeOffset now, out FileToken? file)
    {
        file = null;
        if (string.IsNullOrEmpty(token) || token.Length > 4096) return false;
        var dot = token.IndexOf('.');
        if (dot <= 0 || dot == token.Length - 1) return false;

        var body = token[..dot];
        byte[] signature;
        try { signature = FromBase64Url(token[(dot + 1)..]); }
        catch (FormatException) { return false; }
        if (!CryptographicOperations.FixedTimeEquals(signature, Sign(body))) return false;

        try { file = JsonSerializer.Deserialize<FileToken>(FromBase64Url(body)); }
        catch (Exception ex) when (ex is JsonException or FormatException) { return false; }

        if (file is null || string.IsNullOrEmpty(file.Area) || string.IsNullOrEmpty(file.Key)) return false;
        if (!StorageAreas.Folders.ContainsKey(file.Area)) return false;
        if (now.ToUnixTimeSeconds() > file.ExpiresUnix) return false;
        return true;
    }

    /// <summary>Absolute download URL for a token: <c>App:PublicUrl</c>, else the current request's host.</summary>
    public string BuildUrl(string token)
    {
        var baseUrl = _publicUrl;
        if (baseUrl is null && _http?.HttpContext?.Request is { } request)
            baseUrl = $"{request.Scheme}://{request.Host}{request.PathBase}".TrimEnd('/');
        return $"{baseUrl}{RoutePrefix}{token}";
    }

    /// <summary>
    /// Maps a link produced by <see cref="BuildUrl"/> back to its logical <c>minio:{area}/{key}</c> path
    /// (the builder sends image URLs back). Expiry is ignored here: the signature proves we issued it.
    /// </summary>
    public string? TryConvertToStoragePath(string url)
    {
        var idx = url.IndexOf(ParsePrefix, StringComparison.Ordinal);
        if (idx < 0) return null;
        var token = url[(idx + ParsePrefix.Length)..];
        var cut = token.IndexOfAny(['?', '#']);
        if (cut >= 0) token = token[..cut];
        return TryRead(token, DateTimeOffset.MinValue, out var file) && file is not null
            ? $"minio:{file.Area}/{file.Key}"
            : null;
    }

    private byte[] Sign(string body) => HMACSHA256.HashData(_key, Encoding.ASCII.GetBytes(body));

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string s)
    {
        var b = s.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(b.PadRight(b.Length + (4 - b.Length % 4) % 4, '='));
    }
}
