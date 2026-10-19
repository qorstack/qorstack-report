using System.Text.Json;
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
using QorstackReportService.Application.Projects.Commands.UpdateLogSettings;
using QorstackReportService.Application.Projects.Models;
using QorstackReportService.Application.Projects.Queries.GetProjectById;
using QorstackReportService.Application.Projects.Queries.GetLogSettings;
using QorstackReportService.Application.Projects.Queries.GetProjects;
using QorstackReportService.Application.Projects.Transfer;
using Microsoft.Extensions.Configuration;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

public class Projects : EndpointGroupBase
{
    public override void Map(IEndpointRouteBuilder app)
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

        group.MapGet("/{id:guid}/log-settings", GetLogSettings)
            .Produces<LogSettingsDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Get log settings for a project")
            .WithDescription("Returns whether logging is enabled and the retention period in days.");

        group.MapPut("/{id:guid}/log-settings", UpdateLogSettings)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Update log settings for a project")
            .WithDescription("Configure whether report job logging is enabled and how many days logs are retained (0 = keep forever).");

        // Pro: move a whole project between deployments as one ZIP.
        group.MapGet("/{id:guid}/export", ExportProject)
            .Produces(StatusCodes.Status200OK, contentType: "application/zip")
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("Export the project as a ZIP (Pro)")
            .WithDescription("Latest active version of every template, its saved test data and builder images, and uploaded fonts. API keys, members and history are not included.");

        var importLimitMb = Math.Max(1, app.ServiceProvider.GetRequiredService<IConfiguration>().GetValue("Transfer:MaxZipMb", 200));
        group.MapPost("/{id:guid}/import", ImportProject)
            .DisableAntiforgery()
            .Accepts<IFormFile>("multipart/form-data")
            .WithMetadata(new TransferBodySizeLimit(importLimitMb * 1024L * 1024L + 1024 * 1024))
            .WithFormOptions(multipartBodyLengthLimit: importLimitMb * 1024L * 1024L)
            .Produces<ProjectImportResult>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("Import a project ZIP (Pro)")
            .WithDescription("dryRun=true returns the plan (with what differs per template) without changing anything. Applying commits each font and template on its own; stream=true returns application/x-ndjson progress lines (start, font, template, done) instead of one JSON body.");
    }

    public async Task<IResult> ExportProject(IProjectTransferService transfer, Guid id, CancellationToken ct)
    {
        var fileName = await transfer.PrepareExportAsync(id, ct);
        return Results.Stream(stream => transfer.ExportAsync(id, stream, ct), "application/zip", fileName);
    }

    public async Task<IResult> ImportProject(
        IProjectTransferService transfer,
        IConfiguration configuration,
        Guid id,
        [FromForm(Name = "file")] IFormFile? file,
        [FromQuery] bool dryRun,
        [FromQuery] bool stream,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return Results.BadRequest("Choose a .zip file exported from Qorstack.");
        var maxMb = Math.Max(1, configuration.GetValue("Transfer:MaxZipMb", 200));
        if (file.Length > maxMb * 1024L * 1024L)
            return Results.BadRequest($"The file is larger than {maxMb} MB (PROJECT_IMPORT_MAX_MB).");

        // ZipArchive needs a seekable stream; spool to a temp file that is removed on close.
        var tempPath = Path.Combine(Path.GetTempPath(), $"qorstack-import-{Guid.NewGuid():N}.zip");
        await using var temp = new FileStream(tempPath, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None, 81920, FileOptions.DeleteOnClose);
        await file.CopyToAsync(temp, ct);
        temp.Position = 0;

        if (dryRun || !stream)
            return Results.Ok(await transfer.ImportAsync(id, temp, dryRun, ct));

        // stream=true: one JSON object per line as each font / template finishes, then "done" with the result.
        // Errors before the first line (invalid ZIP, not Pro, no access) still return a normal problem response.
        var response = httpContext.Response;
        var json = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var started = false;

        async Task WriteLineAsync(object value)
        {
            if (!started)
            {
                started = true;
                response.StatusCode = StatusCodes.Status200OK;
                response.ContentType = "application/x-ndjson; charset=utf-8";
                response.Headers.CacheControl = "no-cache";
                response.Headers["X-Accel-Buffering"] = "no"; // nginx: do not buffer, so progress shows live
            }
            await response.WriteAsync(JsonSerializer.Serialize(value, json) + "\n", ct);
            await response.Body.FlushAsync(ct);
        }

        try
        {
            var result = await transfer.ImportAsync(id, temp, dryRun: false, ct, e => WriteLineAsync(e));
            await WriteLineAsync(new { type = "done", result });
        }
        catch (Exception ex) when (started && ex is not OperationCanceledException)
        {
            // Items already finished stay imported; tell the client why the rest did not run.
            await WriteLineAsync(new { type = "error", message = ex.Message });
        }
        return Results.Empty;
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

    public async Task<IResult> GetLogSettings(ISender sender, Guid id)
    {
        var result = await sender.Send(new GetLogSettingsQuery(id));
        return result != null ? Results.Ok(result) : Results.NotFound();
    }

    public async Task<IResult> UpdateLogSettings(ISender sender, Guid id, [FromBody] UpdateLogSettingsRequest request)
    {
        var success = await sender.Send(new UpdateLogSettingsCommand(id, request.LogEnabled, request.LogRetentionDays));
        return success ? Results.NoContent() : Results.NotFound();
    }
}

/// <summary>Request body limit for project imports (Transfer:MaxZipMb, env PROJECT_IMPORT_MAX_MB).</summary>
internal sealed class TransferBodySizeLimit(long bytes) : Microsoft.AspNetCore.Http.Metadata.IRequestSizeLimitMetadata
{
    public long? MaxRequestBodySize { get; } = bytes;
}
