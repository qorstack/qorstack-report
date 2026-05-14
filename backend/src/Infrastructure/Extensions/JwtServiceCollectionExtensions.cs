using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace QorstackReportService.Infrastructure.Extensions;
public static class JwtServiceCollectionExtensions
{
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtSection = configuration.GetSection("Jwt");
        var issuer = jwtSection["Issuer"]!;
        var audience = jwtSection["Audience"]!;
        var key = jwtSection["Key"]!;

        services
          .AddAuthentication(options =>
          {
              options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
              options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
          })
          .AddJwtBearer(options =>
          {
              options.TokenValidationParameters = new TokenValidationParameters
              {
                  ValidateIssuer = true,
                  ValidateAudience = true,
                  ValidateIssuerSigningKey = true,
                  ValidIssuer = issuer,
                  ValidAudience = audience,
                  IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
              };

              options.Events = new JwtBearerEvents
              {
                  OnMessageReceived = ctx =>
                  {
                      // 1) Prefer Authorization header if present
                      var auth = ctx.Request.Headers["Authorization"].FirstOrDefault();
                      if (!string.IsNullOrEmpty(auth) && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                      {
                          return Task.CompletedTask;
                      }

                      // 2) Otherwise fall back to NextAuth cookie
                      var cookieName = ctx.Request.Cookies.ContainsKey("__Secure-next-auth.session-token")
                                       ? "__Secure-next-auth.session-token"
                                       : "next-auth.session-token";

                      if (ctx.Request.Cookies.TryGetValue(cookieName, out var jwtFromCookie))
                      {
                          ctx.Token = jwtFromCookie;
                      }

                      return Task.CompletedTask;
                  },
                  OnTokenValidated = ctx =>
                  {
                      return Task.CompletedTask;
                  },
                  OnAuthenticationFailed = ctx =>
                  {
                      return Task.CompletedTask;
                  },
                  OnChallenge = ctx =>
                  {
                      return Task.CompletedTask;
                  }
              };
          });

        return services;
    }
}
