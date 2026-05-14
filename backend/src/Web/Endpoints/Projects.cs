using System;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Projects.Commands.CreateProject;
using QorstackReportService.Application.Projects.Commands.CreateProjectApiKey;
using QorstackReportService.Application.Projects.Commands.DeleteProject;
using QorstackReportService.Application.Projects.Commands.UpdateProject;
using QorstackReportService.Application.Projects.Models;
using QorstackReportService.Application.Projects.Queries.GetProjectById;
using QorstackReportService.Application.Projects.Queries.GetProjects;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

public class Projects : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/projects")
            .RequireAuthorization()
            .WithTags("Projects");

        group.MapGet("/", GetProjects)
            .Produces<List<ProjectDto>>(StatusCodes.Status200OK);

        group.MapGet("/{id:guid}", GetProjectById)
            .Produces<ProjectDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/", CreateProject)
            .Produces<Guid>(StatusCodes.Status200OK);

        group.MapPut("/{id:guid}", UpdateProject)
            .Produces(StatusCodes.Status204NoContent);

        group.MapDelete("/{id:guid}", DeleteProject)
            .Produces(StatusCodes.Status204NoContent);

        group.MapPost("/{id:guid}/api-keys", CreateApiKey)
            .Produces<ProjectApiKeyDto>(StatusCodes.Status200OK);
    }

    public async Task<IResult> GetProjects(ISender sender)
    {
        var result = await sender.Send(new GetProjectsQuery());
        return Results.Ok(result);
    }

    public async Task<IResult> GetProjectById(ISender sender, Guid id)
    {
        var project = await sender.Send(new GetProjectByIdQuery(id));
        return project != null ? Results.Ok(project) : Results.NotFound();
    }

    public async Task<IResult> CreateProject(ISender sender, [FromBody] CreateProjectRequest request)
    {
        var id = await sender.Send(new CreateProjectCommand(request.Name, request.Description));
        return Results.Ok(id);
    }

    public async Task<IResult> UpdateProject(ISender sender, Guid id, [FromBody] UpdateProjectRequest request)
    {
        await sender.Send(new UpdateProjectCommand(id, request.Name, request.Description));
        return Results.NoContent();
    }

    public async Task<IResult> DeleteProject(ISender sender, Guid id)
    {
        await sender.Send(new DeleteProjectCommand(id));
        return Results.NoContent();
    }

    public async Task<IResult> CreateApiKey(ISender sender, Guid id, [FromBody] CreateProjectApiKeyRequest request)
    {
        var apiKey = await sender.Send(new CreateProjectApiKeyCommand(id, request.Name));
        return Results.Ok(new ProjectApiKeyDto(apiKey));
    }
}
