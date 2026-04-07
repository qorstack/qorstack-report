using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

/// <summary>
/// Public endpoint that advertises which optional features are enabled.
/// Frontend uses this to show/hide Pro-only UI elements.
/// No authentication required.
/// </summary>
public class Features : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        app.MapGroup("/features")
            .WithTags("Features")
            .MapGet("/", GetFeatures)
            .AllowAnonymous()
            .Produces<FeatureFlagsResponse>(StatusCodes.Status200OK);
    }

    public IResult GetFeatures(IFeatureFlagService flags) =>
        Results.Ok(new FeatureFlagsResponse(
            PdfPasswordProtection: flags.PdfPasswordProtection,
            PdfWatermark: flags.PdfWatermark,
            ProjectMembers: flags.ProjectMembers
        ));
}

public record FeatureFlagsResponse(
    bool PdfPasswordProtection,
    bool PdfWatermark,
    bool ProjectMembers
);
