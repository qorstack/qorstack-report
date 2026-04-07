using System.Threading.RateLimiting;
using Azure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Linq;
using System.Collections.Generic;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Infrastructure.Data;
using QorstackReportService.Web.Converters;
using QorstackReportService.Web.Infrastructure;
using QorstackReportService.Web.Services;
using Microsoft.AspNetCore.Mvc;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static IServiceCollection AddWebServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDatabaseDeveloperPageExceptionFilter();

        services.AddScoped<IUser, CurrentUser>();

        services.AddHttpContextAccessor();
        services.AddMemoryCache();

        // Add Authentication services
        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddApiKeyAuthentication()
            .AddJwtBearer(options =>
            {
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        // Optional: Prioritize Authorization header if present (for API clients/SaaS)
                        if (context.Request.Headers.ContainsKey("Authorization"))
                        {
                            return Task.CompletedTask;
                        }

                        if (context.Request.Cookies.TryGetValue("accessToken", out var accessToken))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"],
                    ValidAudience = configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!))
                };
            });

        // Add Authorization services
        services.AddAuthorization(options =>
        {
            var defaultAuthorizationPolicyBuilder = new AuthorizationPolicyBuilder(
                JwtBearerDefaults.AuthenticationScheme,
                ApiKeyAuthenticationOptions.DefaultScheme);

            defaultAuthorizationPolicyBuilder = defaultAuthorizationPolicyBuilder.RequireAuthenticatedUser();

            options.DefaultPolicy = defaultAuthorizationPolicyBuilder.Build();
        });

        // Add CORS services - get allowed hosts from configuration
        services.AddCors(options =>
        {
            var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.ToList() ?? new List<string>();
            var allowedOriginsString = configuration["Cors:AllowedOriginsString"];
            if (!string.IsNullOrEmpty(allowedOriginsString))
            {
                allowedOrigins.AddRange(allowedOriginsString.Split(',', StringSplitOptions.RemoveEmptyEntries));
            }

            var finalOrigins = allowedOrigins.Select(o => o.Trim()).Distinct().ToArray();

            options.AddPolicy("AllowDevelopmentOrigins",
                builder => builder
                    .WithOrigins(finalOrigins)
                    .WithHeaders("Content-Type", "Authorization", "X-API-Key", "X-Requested-With")
                    .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .AllowCredentials());
        });

        // DDoS protection: block abusive traffic only (normal users won't hit these limits)
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                var httpContext = context.HttpContext;
                var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                var logger = httpContext.RequestServices.GetRequiredService<ILoggerFactory>()
                    .CreateLogger("RateLimiting");

                logger.LogWarning("Rate limit exceeded for IP {IP} on {Method} {Path}",
                    ip, httpContext.Request.Method, httpContext.Request.Path);

                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    httpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
                }

                httpContext.Response.ContentType = "application/json";
                await httpContext.Response.WriteAsJsonAsync(new
                {
                    status = 429,
                    message = "Too many requests. Please try again later.",
                    retryAfterSeconds = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry)
                        ? (int)retry.TotalSeconds
                        : 60
                }, cancellationToken);
            };
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
                httpContext => RateLimitPartition.GetFixedWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 5000,
                        Window = TimeSpan.FromMinutes(1)
                    }));
        });

        services.AddHealthChecks()
            .AddDbContextCheck<ApplicationDbContext>();

        services.AddExceptionHandler<CustomExceptionHandler>();
        // this wires up your converter for Minimal APIs:

        services.ConfigureHttpJsonOptions(opts =>
        {
            opts.SerializerOptions.Converters.Add(new DateTimeLocalConverter());
        });

        // Customise default API behaviour
        services.Configure<ApiBehaviorOptions>(options =>
            options.SuppressModelStateInvalidFilter = true);

        services.AddControllers();

        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer<ApiKeyDocumentTransformer>();
            options.AddOperationTransformer<ApiKeyOperationTransformer>();
            options.AddOperationTransformer<SdkOperationTransformer>();
        });

        return services;
    }

}
