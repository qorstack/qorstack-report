using MediatR;
using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.DTOs;
using QorstackReportService.Application.Plans.Queries.GetPlans;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

/// <summary>
/// API endpoints for plan management
/// </summary>
public class Plans : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/plans")
            .WithTags("Plans")
            .RequireAuthorization();

        group.MapGet("/", GetPlans)
            .Produces<PaginatedList<PlanDto>>(StatusCodes.Status200OK)
            .WithSummary("Get available plans")
            .WithDescription("Retrieve all active and visible plans ordered by display order.");
    }

    /// <summary>
    /// Get all available plans
    /// </summary>
    public async Task<IResult> GetPlans(
        ISender sender,
        [AsParameters] GetPlansQuery query)
    {
        var result = await sender.Send(query);
        return Results.Ok(result);
    }
}
