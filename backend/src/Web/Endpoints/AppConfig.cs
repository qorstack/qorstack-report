using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

/// <summary>
/// Public, non-secret settings the web UI needs at runtime (the UI is a static build shared by every
/// install, so per-install values cannot be baked in at build time). No authentication required.
/// </summary>
public class AppConfig : EndpointGroupBase
{
    public override void Map(IEndpointRouteBuilder app)
    {
        app.MapGroup("/app-config")
            .WithTags("AppConfig")
            .MapGet("/", Get)
            .AllowAnonymous()
            .Produces<AppConfigResponse>(StatusCodes.Status200OK);
    }

    public IResult Get(IConfiguration config) =>
        Results.Ok(new AppConfigResponse(
            GoogleClientId: NullIfEmpty(config["Google:ClientId"]),
            GithubClientId: NullIfEmpty(config["GitHub:ClientId"])));

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;
}

/// <summary>OAuth client ids are public by design (they appear in the browser's sign-in URL).</summary>
public record AppConfigResponse(string? GoogleClientId, string? GithubClientId);
