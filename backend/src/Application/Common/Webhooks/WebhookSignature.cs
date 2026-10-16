using System.Security.Cryptography;
using System.Text;

namespace QorstackReportService.Application.Common.Webhooks;

/// <summary>
/// Webhook body signature: <c>X-Qorstack-Signature: sha256=&lt;lowercase hex HMAC-SHA256(body, secret)&gt;</c>.
/// Receivers recompute it over the raw body and compare in constant time.
/// </summary>
public static class WebhookSignature
{
    public const string HeaderName = "X-Qorstack-Signature";

    public static string Compute(string body, string secret)
    {
        var hash = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(body));
        return "sha256=" + Convert.ToHexString(hash).ToLowerInvariant();
    }

    public static bool Verify(string body, string secret, string? header) =>
        header != null && CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(Compute(body, secret)), Encoding.ASCII.GetBytes(header));
}
