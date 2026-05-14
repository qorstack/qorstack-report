using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Web.Infrastructure;

/// <summary>
/// Authentication handler for X-API-Key header validation
/// </summary>
public class ApiKeyAuthenticationHandler : AuthenticationHandler<ApiKeyAuthenticationOptions>
{
    private const string ApiKeyHeaderName = "X-API-Key";
    private readonly IApplicationDbContext _dbContext;
    private readonly IMemoryCache _cache;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<ApiKeyAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IApplicationDbContext dbContext,
        IMemoryCache cache)
        : base(options, logger, encoder)
    {
        _dbContext = dbContext;
        _cache = cache;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Check if API key header is present
        if (!Request.Headers.TryGetValue(ApiKeyHeaderName, out var apiKeyHeaderValues))
        {
            return AuthenticateResult.NoResult();
        }

        var apiKey = apiKeyHeaderValues.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return AuthenticateResult.Fail("API key is empty");
        }

        // Look up API key in cache or database
        if (!_cache.TryGetValue($"ApiKey_{apiKey}", out ApiKey? apiKeyEntity))
        {
            apiKeyEntity = await _dbContext.ApiKeys
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.XApiKey == apiKey && a.IsActive == true);

            if (apiKeyEntity != null)
            {
                // Cache for 5 minutes
                _cache.Set($"ApiKey_{apiKey}", apiKeyEntity, TimeSpan.FromMinutes(5));
            }
        }

        if (apiKeyEntity == null)
        {
            return AuthenticateResult.Fail("Invalid API key");
        }

        // Check if user is active
        if (apiKeyEntity.User.Status != "active")
        {
            return AuthenticateResult.Fail("User is not active");
        }

        // Create claims
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, apiKeyEntity.UserId.ToString()),
            new("user_id", apiKeyEntity.UserId.ToString()),
            new("api_key_id", apiKeyEntity.Id.ToString()),
            new("user_email", apiKeyEntity.User.Email ?? ""),
            new(ClaimTypes.AuthenticationMethod, "ApiKey")
        };

        if (!string.IsNullOrEmpty(apiKeyEntity.Name))
        {
            claims.Add(new Claim("api_key_name", apiKeyEntity.Name));
        }

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return AuthenticateResult.Success(ticket);
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        Response.Headers.Append("WWW-Authenticate", $"ApiKey realm=\"{Options.Realm}\"");
        return Task.CompletedTask;
    }

    protected override Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    }
}

/// <summary>
/// Options for API key authentication
/// </summary>
public class ApiKeyAuthenticationOptions : AuthenticationSchemeOptions
{
    public const string DefaultScheme = "ApiKey";
    public string Scheme => DefaultScheme;
    public string Realm { get; set; } = "Qorstack Report API";
}

/// <summary>
/// Extension methods for API key authentication
/// </summary>
public static class ApiKeyAuthenticationExtensions
{
    public static AuthenticationBuilder AddApiKeyAuthentication(
        this AuthenticationBuilder builder,
        Action<ApiKeyAuthenticationOptions>? configureOptions = null)
    {
        return builder.AddScheme<ApiKeyAuthenticationOptions, ApiKeyAuthenticationHandler>(
            ApiKeyAuthenticationOptions.DefaultScheme,
            configureOptions ?? (_ => { }));
    }
}
