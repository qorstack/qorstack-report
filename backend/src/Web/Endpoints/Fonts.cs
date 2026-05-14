using MediatR;
using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Fonts.Commands.DeleteFont;
using QorstackReportService.Application.Fonts.Models;
using QorstackReportService.Application.Fonts.Commands.UploadFont;
using QorstackReportService.Application.Fonts.Queries.GetFontById;
using QorstackReportService.Application.Fonts.Queries.GetFonts;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

public class Fonts : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/fonts")
            .WithTags("Fonts")
            .RequireAuthorization();

        group.MapPost("/", Upload)
            .DisableAntiforgery()
            .Accepts<IFormFile>("multipart/form-data")
            .WithSummary("Upload a font file (global)")
            .WithDescription(
                "Upload a font (.ttf, .otf, .woff, .woff2). " +
                "If the same file already exists (by hash), the existing font is returned without re-uploading.")
            .Produces<FontDetailDto>(StatusCodes.Status201Created)
            .Produces<FontDetailDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/", GetAll)
            .WithSummary("List all fonts (global)")
            .WithDescription("Returns all active fonts available to every project.")
            .Produces<List<FontSummaryDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/{fontId:guid}", GetById)
            .WithSummary("Get font details")
            .Produces<FontDetailDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/{fontId:guid}", Delete)
            .WithSummary("Hard delete a font")
            .WithDescription("Permanently removes the font from the database, MinIO storage, and Gotenberg cache.")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static async Task<IResult> Upload(
        ISender sender,
        HttpContext httpContext,
        [AsParameters] UploadFontRequest request)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null) return Results.Unauthorized();

        if (request.File == null)
            return Results.BadRequest("Font file is required");

        var command = new UploadFontCommand
        {
            UserId = userId.Value,
            File = request.File,
            LicenseNote = request.LicenseNote,
        };

        var result = await sender.Send(command);
        return Results.Created($"/fonts/{result.Id}", result);
    }

    private static async Task<IResult> GetAll(
        ISender sender,
        [FromQuery] string? search)
    {
        var result = await sender.Send(new GetFontsQuery { Search = search });
        return Results.Ok(result);
    }

    private static async Task<IResult> GetById(
        ISender sender,
        Guid fontId)
    {
        var result = await sender.Send(new GetFontByIdQuery { FontId = fontId });
        return result is not null ? Results.Ok(result) : Results.NotFound();
    }

    private static async Task<IResult> Delete(
        ISender sender,
        Guid fontId)
    {
        await sender.Send(new HardDeleteFontCommand { FontId = fontId });
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
