using System;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Auth.Commands.ChangePassword;
using QorstackReportService.Application.Auth.Commands.ForgotPassword;
using QorstackReportService.Application.Auth.Commands.GoogleLogin;
using QorstackReportService.Application.Auth.Commands.GithubLogin;
using QorstackReportService.Application.Auth.Commands.GitlabLogin;
using QorstackReportService.Application.Auth.Commands.Login;
using QorstackReportService.Application.Auth.Commands.RefreshToken;
using QorstackReportService.Application.Auth.Commands.Register;
using QorstackReportService.Application.Auth.Commands.ResetPassword;
using QorstackReportService.Application.Auth.Commands.RevokeToken;
using QorstackReportService.Application.Auth.Commands.VerifyOtp;
using QorstackReportService.Application.Auth.Models;
using QorstackReportService.Web.Infrastructure;
using System.Security.Claims;

namespace QorstackReportService.Web.Endpoints;

public class Auth : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/auth")
             .WithTags("Auth");

        group.MapPost("/login", Login)
             .Produces(StatusCodes.Status200OK);

        group.MapPost("/register", Register)
             .Produces<RegisterResponse>(StatusCodes.Status200OK);

        group.MapPost("/verify-otp", VerifyOtp)
             .Produces<VerifyOtpResponse>(StatusCodes.Status200OK);

        group.MapPost("/refresh-token", RefreshToken)
             .Produces(StatusCodes.Status200OK)
             .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/revoke-token", RevokeToken)
             .Produces(StatusCodes.Status200OK);

        group.MapPost("/forgot-password", ForgotPassword)
             .Produces<ForgotPasswordResponse>(StatusCodes.Status200OK);

        group.MapPost("/reset-password", ResetPassword)
             .Produces(StatusCodes.Status200OK);

        group.MapPost("/google-login", GoogleLogin)
             .Produces(StatusCodes.Status200OK);

        group.MapPost("/github-login", GithubLogin)
             .Produces(StatusCodes.Status200OK);

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

        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            IsEssential = true,
            Expires = expires,
            // Production (Secure): ต้องมี HTTPS และ SameSite=None
            // Localhost (Dev): ยอมให้ HTTP ได้ และใช้ SameSite=Lax
            Secure = !isLocalhost || context.Request.IsHttps,
            SameSite = (isLocalhost && !context.Request.IsHttps) ? SameSiteMode.Lax : SameSiteMode.None
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

    public async Task<IResult> VerifyOtp(ISender sender, [FromBody] VerifyOtpRequest request)
    {
        var result = await sender.Send(new VerifyOtpCommand(request.Email, request.Otp, request.Type));
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

    public async Task<IResult> ForgotPassword(ISender sender, [FromBody] ForgotPasswordRequest request)
    {
        var result = await sender.Send(new ForgotPasswordCommand(request.Email));
        return Results.Ok(result);
    }

    public async Task<IResult> ResetPassword(ISender sender, [FromBody] ResetPasswordRequest request)
    {
        await sender.Send(new ResetPasswordCommand(request.VerificationToken, request.NewPassword));
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

    public async Task<IResult> GithubLogin(ISender sender, [FromBody] GithubLoginRequest request, IConfiguration config, HttpContext context, ILogger<Auth> logger)
    {
        var result = await sender.Send(new GithubLoginCommand(request.GithubId, request.Email, request.Name, request.AvatarUrl));

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
