using System;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Auth.Commands.ChangePassword;
using QorstackReportService.Application.Auth.Commands.GoogleLogin;
using QorstackReportService.Application.Auth.Commands.GithubLogin;
using QorstackReportService.Application.Auth.Commands.GitlabLogin;
using QorstackReportService.Application.Auth.Commands.Login;
using QorstackReportService.Application.Auth.Commands.RefreshToken;
using QorstackReportService.Application.Auth.Commands.Register;
using QorstackReportService.Application.Auth.Commands.RevokeToken;
using QorstackReportService.Application.Auth;
using QorstackReportService.Application.Auth.Models;
using QorstackReportService.Web.Infrastructure;
using System.Security.Claims;
using System.Net.Http.Json;

namespace QorstackReportService.Web.Endpoints;

public class Auth : EndpointGroupBase
{
    public override void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth")
             .WithTags("Auth");

        group.MapPost("/login", Login)
             .Produces(StatusCodes.Status200OK);

        group.MapPost("/register", Register)
             .Produces<RegisterResponse>(StatusCodes.Status200OK);

        group.MapPost("/refresh-token", RefreshToken)
             .Produces(StatusCodes.Status200OK)
             .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/revoke-token", RevokeToken)
             .Produces(StatusCodes.Status200OK);

        group.MapPost("/google-login", GoogleLogin)
             .Produces(StatusCodes.Status200OK);

        // The browser only sends GitHub's one-time code; the backend exchanges it with GitHub and
        // reads the profile itself, so a client can never claim someone else's GitHub id.
        group.MapPost("/github/exchange", GithubExchange)
             .Produces(StatusCodes.Status200OK)
             .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapPost("/gitlab-login", GitlabLogin)
             .Produces(StatusCodes.Status200OK);

        group.MapPost("/change-password", ChangePassword)
             .RequireAuthorization()
             .Produces(StatusCodes.Status200OK)
             .Produces(StatusCodes.Status401Unauthorized);
    }

    private void SetTokenCookie(HttpContext context, string token, string cookieName, DateTime expires, ILogger logger)
    {
        var isLocalhost = context.Request.Host.Host == "localhost" || context.Request.Host.Host == "127.0.0.1";
        // Secure when the browser page is on https (Origin / Referer), so plain-HTTP installs (NodePort) sign in
        // without setup; AUTH_COOKIE_SECURE forces it. Rules and reasons: AuthCookiePolicy.
        var configured = AuthCookiePolicy.Parse(context.RequestServices.GetService<IConfiguration>()?[AuthCookiePolicy.ConfigKey]);
        var browserHttps = AuthCookiePolicy.BrowserIsHttps(context.Request.Headers.Origin, context.Request.Headers.Referer);
        var (secure, lax) = AuthCookiePolicy.Resolve(configured, browserHttps, isLocalhost, context.Request.IsHttps);

        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            IsEssential = true,
            Expires = expires,
            Secure = secure,
            SameSite = lax ? SameSiteMode.Lax : SameSiteMode.None
        };

        logger.LogInformation("Setting Cookie [{CookieName}]: Secure={Secure}, SameSite={SameSite}, Host={Host}, Scheme={Scheme}",
            cookieName, cookieOptions.Secure, cookieOptions.SameSite, context.Request.Host.Host, context.Request.Scheme);

        context.Response.Cookies.Append(cookieName, token, cookieOptions);
    }

    public async Task<IResult> Login(ISender sender, [FromBody] LoginRequest request, IConfiguration config, HttpContext context, ILogger<Auth> logger)
    {
        var result = await sender.Send(new LoginCommand(request.Email, request.Password));

        var expiryMinutes = double.Parse(config["Jwt:ExpiryMinutes"] ?? "15", System.Globalization.CultureInfo.InvariantCulture);
        var refreshTokenExpiryDays = double.Parse(config["Jwt:RefreshTokenExpiryDays"] ?? "7", System.Globalization.CultureInfo.InvariantCulture);
        SetTokenCookie(context, result.AccessToken, "accessToken", DateTime.UtcNow.AddMinutes(expiryMinutes), logger);
        SetTokenCookie(context, result.RefreshToken, "refreshToken", DateTime.UtcNow.AddDays(refreshTokenExpiryDays), logger);

        return Results.Ok();
    }

    public async Task<IResult> Register(ISender sender, [FromBody] RegisterRequest request)
    {
        var result = await sender.Send(new RegisterCommand(request.Email, request.Password, request.FirstName, request.LastName));
        return Results.Ok(result);
    }

    public async Task<IResult> RefreshToken(ISender sender, IConfiguration config, HttpContext context, ILogger<Auth> logger)
    {
        if (!context.Request.Cookies.TryGetValue("refreshToken", out var refreshToken) || string.IsNullOrEmpty(refreshToken))
        {
            return Results.Unauthorized();
        }

        context.Request.Cookies.TryGetValue("accessToken", out var accessToken);

        try
        {
            var result = await sender.Send(new RefreshTokenCommand(accessToken ?? "", refreshToken));

            var expiryMinutes = double.Parse(config["Jwt:ExpiryMinutes"] ?? "15", System.Globalization.CultureInfo.InvariantCulture);
            var refreshTokenExpiryDays = double.Parse(config["Jwt:RefreshTokenExpiryDays"] ?? "7", System.Globalization.CultureInfo.InvariantCulture);
            SetTokenCookie(context, result.AccessToken, "accessToken", DateTime.UtcNow.AddMinutes(expiryMinutes), logger);
            SetTokenCookie(context, result.RefreshToken, "refreshToken", DateTime.UtcNow.AddDays(refreshTokenExpiryDays), logger);

            return Results.Ok();
        }
        catch (Exception)
        {
            // Security: Clear cookies if refresh fails
            context.Response.Cookies.Delete("accessToken");
            context.Response.Cookies.Delete("refreshToken");
            return Results.Unauthorized();
        }
    }

    public async Task<IResult> RevokeToken(ISender sender, HttpContext context)
    {
        if (context.Request.Cookies.TryGetValue("refreshToken", out var refreshToken) && !string.IsNullOrEmpty(refreshToken))
        {
            try
            {
                await sender.Send(new RevokeTokenCommand(refreshToken));
            }
            catch { /* Best effort revocation */ }
        }

        // Always clear cookies on logout
        context.Response.Cookies.Delete("accessToken");
        context.Response.Cookies.Delete("refreshToken");

        return Results.Ok();
    }

    public async Task<IResult> GoogleLogin(ISender sender, [FromBody] GoogleLoginRequest request, IConfiguration config, HttpContext context, ILogger<Auth> logger)
    {
        var result = await sender.Send(new GoogleLoginCommand(request.GoogleId, request.Email, request.FirstName, request.LastName, request.PhotoUrl));

        var expiryMinutes = double.Parse(config["Jwt:ExpiryMinutes"] ?? "15", System.Globalization.CultureInfo.InvariantCulture);
        var refreshTokenExpiryDays = double.Parse(config["Jwt:RefreshTokenExpiryDays"] ?? "7", System.Globalization.CultureInfo.InvariantCulture);
        SetTokenCookie(context, result.AccessToken, "accessToken", DateTime.UtcNow.AddMinutes(expiryMinutes), logger);
        SetTokenCookie(context, result.RefreshToken, "refreshToken", DateTime.UtcNow.AddDays(refreshTokenExpiryDays), logger);

        return Results.Ok();
    }

    public record GithubExchangeRequest(string Code);

    public async Task<IResult> GithubExchange(ISender sender, [FromBody] GithubExchangeRequest request, IConfiguration config,
        IHttpClientFactory httpFactory, HttpContext context, ILogger<Auth> logger)
    {
        var clientId = config["GitHub:ClientId"];
        var clientSecret = config["GitHub:ClientSecret"];
        if (string.IsNullOrWhiteSpace(request?.Code))
            return Results.BadRequest(new { message = "code is required" });
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            return Results.BadRequest(new { message = "GitHub login is not configured (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET)." });

        var http = httpFactory.CreateClient();
        http.Timeout = TimeSpan.FromSeconds(15);
        http.DefaultRequestHeaders.UserAgent.ParseAdd("QorstackReport");
        http.DefaultRequestHeaders.Accept.ParseAdd("application/json");

        using var tokenResponse = await http.PostAsync("https://github.com/login/oauth/access_token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = clientId, ["client_secret"] = clientSecret, ["code"] = request.Code
            }));
        var tokenJson = await tokenResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        if (!tokenJson.TryGetProperty("access_token", out var tokenProp) || tokenProp.GetString() is not { Length: > 0 } accessToken)
        {
            logger.LogWarning("GitHub code exchange failed: {Status}", tokenResponse.StatusCode);
            return Results.BadRequest(new { message = "GitHub did not accept the login code. Please try again." });
        }

        http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var user = await http.GetFromJsonAsync<System.Text.Json.JsonElement>("https://api.github.com/user");
        var githubId = user.GetProperty("id").GetRawText();
        var name = user.TryGetProperty("name", out var n) && n.ValueKind == System.Text.Json.JsonValueKind.String ? n.GetString() : user.GetProperty("login").GetString();
        var avatar = user.TryGetProperty("avatar_url", out var av) ? av.GetString() : null;
        var email = user.TryGetProperty("email", out var em) && em.ValueKind == System.Text.Json.JsonValueKind.String ? em.GetString() : null;
        if (string.IsNullOrEmpty(email))
        {
            var emails = await http.GetFromJsonAsync<System.Text.Json.JsonElement>("https://api.github.com/user/emails");
            foreach (var e in emails.EnumerateArray())
                if (e.GetProperty("primary").GetBoolean() && e.GetProperty("verified").GetBoolean()) { email = e.GetProperty("email").GetString(); break; }
        }
        if (string.IsNullOrEmpty(email))
            return Results.BadRequest(new { message = "Your GitHub account has no verified email address." });

        var result = await sender.Send(new GithubLoginCommand(githubId, email, name ?? email, avatar ?? string.Empty));

        var expiryMinutes = double.Parse(config["Jwt:ExpiryMinutes"] ?? "15", System.Globalization.CultureInfo.InvariantCulture);
        var refreshTokenExpiryDays = double.Parse(config["Jwt:RefreshTokenExpiryDays"] ?? "7", System.Globalization.CultureInfo.InvariantCulture);
        SetTokenCookie(context, result.AccessToken, "accessToken", DateTime.UtcNow.AddMinutes(expiryMinutes), logger);
        SetTokenCookie(context, result.RefreshToken, "refreshToken", DateTime.UtcNow.AddDays(refreshTokenExpiryDays), logger);

        return Results.Ok();
    }

    public async Task<IResult> GitlabLogin(ISender sender, [FromBody] GitlabLoginRequest request, IConfiguration config, HttpContext context, ILogger<Auth> logger)
    {
        var result = await sender.Send(new GitlabLoginCommand(request.GitlabId, request.Email, request.Name, request.AvatarUrl));

        var expiryMinutes = double.Parse(config["Jwt:ExpiryMinutes"] ?? "15", System.Globalization.CultureInfo.InvariantCulture);
        var refreshTokenExpiryDays = double.Parse(config["Jwt:RefreshTokenExpiryDays"] ?? "7", System.Globalization.CultureInfo.InvariantCulture);
        SetTokenCookie(context, result.AccessToken, "accessToken", DateTime.UtcNow.AddMinutes(expiryMinutes), logger);
        SetTokenCookie(context, result.RefreshToken, "refreshToken", DateTime.UtcNow.AddDays(refreshTokenExpiryDays), logger);

        return Results.Ok();
    }

    public async Task<IResult> ChangePassword(ISender sender, [FromBody] ChangePasswordRequest request, ClaimsPrincipal user)
    {
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId == null) return Results.Unauthorized();

        await sender.Send(new ChangePasswordCommand(userId, request.OldPassword, request.NewPassword));
        return Results.Ok();
    }
}
