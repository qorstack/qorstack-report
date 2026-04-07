using MediatR;
using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.DTOs;
using QorstackReportService.Application.ReportJobs.Commands.CreateReportJob;
using QorstackReportService.Application.ReportJobs.Queries.GetReportJobs;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

/// <summary>
/// API endpoints for report job management
/// </summary>
public class ReportJobs : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/report-jobs")
            .WithTags("Report Jobs")
            .RequireAuthorization();

        group.MapPost("/", CreateReportJob)
            .Produces<CreateReportJobResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status402PaymentRequired)
            .WithSummary("Create report job")
            .WithDescription("Create a new report generation job with hybrid quota charging (subscription first, then credit fallback).");

        group.MapGet("/", GetReportJobs)
            .Produces<PaginatedList<ReportJobDto>>(StatusCodes.Status200OK)
            .WithSummary("Get report jobs")
            .WithDescription("Retrieve report jobs for the authenticated user.");
    }

    /// <summary>
    /// Create a new report job with quota charging
    /// </summary>
    public async Task<IResult> CreateReportJob(
        ISender sender,
        CreateReportJobCommand command,
        HttpContext context)
    {
        var result = await sender.Send(command);
        return Results.Created($"/report-jobs/{result.JobId}", result);
    }

    /// <summary>
    /// Get report jobs
    /// </summary>
    public async Task<IResult> GetReportJobs(
        ISender sender,
        [AsParameters] GetReportJobsQuery query)
    {
        var result = await sender.Send(query);
        return Results.Ok(result);
    }
}
