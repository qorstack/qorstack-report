using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using QorstackReportService.Application.Analytics.Models;
using QorstackReportService.Application.Analytics.Queries.GetContributions;
using QorstackReportService.Application.Analytics.Queries.GetDashboardSummary;
using QorstackReportService.Application.Analytics.Queries.GetGenerations;
using QorstackReportService.Application.Analytics.Queries.GetHourlyUsage;
using QorstackReportService.Application.Analytics.Queries.GetTemplatePerformance;
using QorstackReportService.Application.Analytics.Queries.GetUsage;
using QorstackReportService.Application.Analytics.Queries.GetWeeklyUsage;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

public class Analytics : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/analytics")
            .RequireAuthorization()
            .WithTags("Analytics");

        // Dashboard summary — single endpoint for all metric cards
        group.MapGet("/dashboard-summary", GetDashboardSummary)
            .Produces<DashboardSummaryDto>(StatusCodes.Status200OK);

        // Contribution graph (GitHub-style activity heatmap)
        group.MapGet("/contributions", GetContributions)
            .Produces<ContributionDataDto>(StatusCodes.Status200OK);

        // Flexible usage data (replaces rigid weekly-only)
        group.MapGet("/usage", GetUsage)
            .Produces<UsageDataDto>(StatusCodes.Status200OK);

        // Hourly usage summary
        group.MapGet("/usage/hourly", GetHourlyUsage)
            .Produces<List<HourlyUsageDto>>(StatusCodes.Status200OK);

        // Existing: Weekly usage (backward compatible)
        group.MapGet("/usage/weekly", GetWeeklyUsage)
            .Produces<List<WeeklyUsageDto>>(StatusCodes.Status200OK);

        // Template performance (enhanced with filters)
        group.MapGet("/templates", GetTemplatePerformance)
            .Produces<List<TemplatePerformanceDto>>(StatusCodes.Status200OK);

        // Generation logs (enhanced with pagination & filters)
        group.MapGet("/generations", GetGenerations)
            .Produces<PaginatedList<GenerationDto>>(StatusCodes.Status200OK);
    }

    public async Task<IResult> GetDashboardSummary(
        ISender sender,
        [FromQuery] string range = "7D",
        [FromQuery] Guid? projectId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await sender.Send(new GetDashboardSummaryQuery(range, projectId, fromDate, toDate));
        return Results.Ok(result);
    }

    public async Task<IResult> GetContributions(
        ISender sender,
        [FromQuery] int? year = null)
    {
        var result = await sender.Send(new GetContributionsQuery(year));
        return Results.Ok(result);
    }

    public async Task<IResult> GetUsage(
        ISender sender,
        [FromQuery] string range = "7D",
        [FromQuery] string groupBy = "day",
        [FromQuery] Guid? projectId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await sender.Send(new GetUsageQuery(range, groupBy, projectId, fromDate, toDate));
        return Results.Ok(result);
    }

    public async Task<IResult> GetHourlyUsage(
        ISender sender,
        [FromQuery] string? date = null)
    {
        var result = await sender.Send(new GetHourlyUsageQuery(date));
        return Results.Ok(result);
    }

    public async Task<IResult> GetWeeklyUsage(ISender sender)
    {
        var result = await sender.Send(new GetWeeklyUsageQuery());
        return Results.Ok(result);
    }

    public async Task<IResult> GetTemplatePerformance(
        ISender sender,
        [FromQuery] string? range = null,
        [FromQuery] Guid? projectId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await sender.Send(new GetTemplatePerformanceQuery(range ?? "7D", projectId, fromDate, toDate));
        return Results.Ok(result);
    }

    public async Task<IResult> GetGenerations(
        ISender sender,
        [FromQuery] Guid? projectId = null,
        [FromQuery] string? templateKey = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 15,
        [FromQuery] string sortBy = "createdDatetime",
        [FromQuery] string sortDirection = "desc")
    {
        var result = await sender.Send(new GetGenerationsQuery(
            projectId, templateKey, status, fromDate, toDate,
            pageNumber, pageSize, sortBy, sortDirection));
        return Results.Ok(result);
    }
}
