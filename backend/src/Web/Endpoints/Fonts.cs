using MediatR;
using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Fonts.Commands.DeleteFont;
using QorstackReportService.Application.Fonts.Models;
using QorstackReportService.Application.Fonts.Commands.UploadFont;
using QorstackReportService.Application.Fonts.Queries.GetFontById;
using QorstackReportService.Application.Fonts.Queries.GetProjectFonts;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

public class Fonts : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/projects/{projectId:guid}/fonts")
            .WithTags("Fonts")
            .RequireAuthorization();

        group.MapPost("/", Upload)
            .DisableAntiforgery()
            .Accepts<IFormFile>("multipart/form-data")
            .WithSummary("Upload a font file")
            .WithDescription(
                "Upload a font (.ttf, .otf, .woff, .woff2). " +
                "If the same file already exists in the system, the project gets ownership without re-uploading storage.")
            .Produces<FontDetailDto>(StatusCodes.Status201Created)
            .Produces<FontDetailDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/", GetAll)
            .WithSummary("List fonts accessible to a project")
            .WithDescription("Returns system fonts (usable by all) and fonts owned by this project.")
            .Produces<List<FontSummaryDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/{fontId:guid}", GetById)
            .WithSummary("Get font details")
            .Produces<FontDetailDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/{fontId:guid}", Delete)
            .WithSummary("Remove font ownership")
            .WithDescription("Removes this project's ownership of the font. If no other project owns the font, it is deactivated.")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static async Task<IResult> Upload(
        ISender sender,
        HttpContext httpContext,
        Guid projectId,
        [AsParameters] UploadFontRequest request)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null) return Results.Unauthorized();

        if (request.File == null)
            return Results.BadRequest("Font file is required");

        var command = new UploadFontCommand
        {
            ProjectId = projectId,
            UserId = userId.Value,
            File = request.File,
            LicenseNote = request.LicenseNote,
        };

        var result = await sender.Send(command);

        // 200 if ownership already existed (idempotent), 201 if newly created
        return result.OwnershipId.HasValue
            ? Results.Created($"/projects/{projectId}/fonts/{result.Id}", result)
            : Results.Ok(result);
    }

    private static async Task<IResult> GetAll(
        ISender sender,
        HttpContext httpContext,
        Guid projectId,
        [FromQuery] string? search)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null) return Results.Unauthorized();

        var result = await sender.Send(new GetProjectFontsQuery
        {
            ProjectId = projectId,
            UserId = userId.Value,
            Search = search,
        });

        return Results.Ok(result);
    }

    private static async Task<IResult> GetById(
        ISender sender,
        HttpContext httpContext,
        Guid projectId,
        Guid fontId)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null) return Results.Unauthorized();

        var result = await sender.Send(new GetFontByIdQuery
        {
            FontId = fontId,
            ProjectId = projectId,
            UserId = userId.Value,
        });

        return result is not null ? Results.Ok(result) : Results.NotFound();
    }

    private static async Task<IResult> Delete(
        ISender sender,
        HttpContext httpContext,
        Guid projectId,
        Guid fontId)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null) return Results.Unauthorized();

        await sender.Send(new DeleteFontOwnershipCommand
        {
            FontId = fontId,
            ProjectId = projectId,
            UserId = userId.Value,
        });

        return Results.NoContent();
    }
}

public class UploadFontRequest
{
    [FromForm(Name = "file")]
    public IFormFile? File { get; set; }

    [FromQuery(Name = "licenseNote")]
    public string? LicenseNote { get; set; }
}
