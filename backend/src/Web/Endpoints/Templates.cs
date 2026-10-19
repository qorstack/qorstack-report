using System.Security.Claims;
using QorstackReportService.Application.Common.Helpers;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.DTOs;
using QorstackReportService.Application.Templates.Commands.DeleteTemplate;
using QorstackReportService.Application.Templates.Commands.SwitchTemplateVersion;
using QorstackReportService.Application.Templates.Commands.RegeneratePreview;
using QorstackReportService.Application.Templates.Commands.UpdateTemplate;
using QorstackReportService.Application.Templates.Commands.UploadTemplate;
using QorstackReportService.Application.Templates.Commands.ImportGalleryTemplate;
using QorstackReportService.Application.Templates.Models;
using QorstackReportService.Application.Templates.Queries.GetTemplateById;
using QorstackReportService.Application.Templates.Queries.GetTemplatesWithPagination;
using QorstackReportService.Application.Templates.Queries.GetGalleryTemplates;
using QorstackReportService.Application.Templates.Queries.GenerateTemplateKey;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

/// <summary>
/// API endpoints for template management
/// </summary>
public class Templates : EndpointGroupBase
{
    public override void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/templates")
            .WithTags("Templates")
            .RequireAuthorization();

        group.MapPost("/", Upload)
            .DisableAntiforgery()
            .Accepts<IFormFile>("multipart/form-data")
            .WithSummary("Upload a new template")
            .WithDescription("Upload a template file (DOCX or XLSX). Name is required via query parameter, file is required via multipart form data.")
            .Produces<TemplateDetailResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/", GetAll)
            .Produces<PaginatedList<TemplateResponse>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/{templateKey}", GetById)
            .WithName("GetTemplateById")
            .Produces<TemplateDetailResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPut("/{templateKey}", Update)
            .DisableAntiforgery()
            .Produces<TemplateDetailResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPut("/{templateKey}/switch-version", SwitchVersion)
            .WithSummary("Switch active version of a template")
            .WithDescription("Switch the active version of a template to a specified version number.")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/{templateKey}/preview", RegeneratePreview)
            .WithName("RegenerateTemplatePreview")
            .WithSummary("Re-render a template's preview")
            .WithDescription("Re-renders the preview PDF of the current version with the fonts the renderer has now (after uploading or importing fonts).")
            .Produces<RegenerateTemplatePreviewResult>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapDelete("/{templateKey}", Delete)
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/{templateKey}/download", Download)
            .WithName("DownloadTemplate")
            .Produces<DownloadTemplateResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/template-generate-key", GenerateKey)
            .WithSummary("Generate a new unique template key")
            .WithDescription("Generates a unique template key for the current user.")
            .Produces<string>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapGet("/{templateKey}/sheets", GetSheets)
            .WithSummary("Get sheet names and page map for an Excel template")
            .Produces<Dictionary<string, int>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        // Template gallery — curated ready-made templates a user can import
        group.MapGet("/gallery", GetGallery)
            .WithSummary("List curated gallery templates available to import")
            .Produces<IReadOnlyList<GalleryTemplateInfo>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        // Public: sample images only, and <img> tags don't send the API's auth header.
        group.MapGet("/gallery/{galleryId}/thumbnail", GetGalleryThumbnail)
            .AllowAnonymous()
            .WithSummary("Preview image of a gallery template (page 1 rendered with its sample data)")
            .Produces(StatusCodes.Status200OK, contentType: "image/png")
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/gallery/{galleryId}/import", ImportGallery)
            .WithSummary("Import a gallery template into a project")
            .WithDescription("Creates a new template in the user's project from a curated gallery template (reuses the upload pipeline).")
            .Produces<TemplateDetailResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status401Unauthorized);
    }

    /// <summary>
    /// List curated gallery templates
    /// </summary>
    private static async Task<IResult> GetGallery(ISender sender)
    {
        var result = await sender.Send(new GetGalleryTemplatesQuery());
        return Results.Ok(result);
    }

    /// <summary>
    /// Preview image of a gallery template
    /// </summary>
    private static IResult GetGalleryThumbnail(IGalleryService gallery, HttpContext httpContext, string galleryId)
    {
        var path = gallery.GetThumbnailPath(galleryId);
        if (path is null) return Results.NotFound();

        httpContext.Response.Headers.CacheControl = "public, max-age=86400";
        return Results.File(path, "image/png", lastModified: File.GetLastWriteTimeUtc(path), enableRangeProcessing: false);
    }

    /// <summary>
    /// Import a gallery template into the user's project
    /// </summary>
    private static async Task<IResult> ImportGallery(
        ISender sender,
        HttpContext httpContext,
        string galleryId,
        [FromBody] ImportGalleryRequest? request)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var command = new ImportGalleryTemplateCommand
        {
            UserId = userId.Value,
            GalleryId = galleryId,
            ProjectId = request?.ProjectId,
            Name = request?.Name
        };

        var template = await sender.Send(command);
        return Results.Created($"/templates/{template.Id}", template);
    }

    /// <summary>
    /// Upload a new template
    /// </summary>
    private static async Task<IResult> Upload(
        ISender sender,
        HttpContext httpContext,
        [AsParameters] UploadTemplateRequest request)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.BadRequest("Name is required");
        }

        if (request.File == null)
        {
            return Results.BadRequest("File is required");
        }

        var command = new UploadTemplateCommand
        {
            UserId = userId.Value,
            Name = request.Name,
            File = request.File,
            TemplateKey = request.TemplateKey,
            ProjectId = request.ProjectId,
            IsAutoGenerateVariables = request.IsAutoGeneratedVariable
        };

        var template = await sender.Send(command);
        return Results.Created($"/templates/{template.Id}", template);
    }

    /// <summary>
    /// Get all templates with pagination
    /// </summary>
    private static async Task<IResult> GetAll(
        ISender sender,
        HttpContext httpContext,
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] Guid? projectId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var query = new GetTemplatesWithPaginationQuery
        {
            UserId = userId.Value,
            Status = status,
            SearchName = search,
            ProjectId = projectId,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await sender.Send(query);
        return Results.Ok(result);
    }

    /// <summary>
    /// Get a template by ID
    /// </summary>
    private static async Task<IResult> GetById(ISender sender, HttpContext httpContext, string templateKey)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var query = new GetTemplateByIdQuery
        {
            TemplateKey = templateKey,
            UserId = userId.Value
        };

        var result = await sender.Send(query);
        return result is not null ? Results.Ok(result) : Results.NotFound();
    }

    /// <summary>
    /// Update a template
    /// </summary>
    private static async Task<IResult> Update(
        ISender sender,
        HttpContext httpContext,
        string templateKey,
        [AsParameters] UpdateTemplateRequest request)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var command = new UpdateTemplateCommand
        {
            TemplateKey = templateKey,
            NewTemplateKey = request.NewTemplateKey,
            UserId = userId.Value,
            Name = request.Name,
            Status = request.Status,
            SandboxPayload = request.SandboxPayload,
            File = request.File,
            ProjectId = request.ProjectId,
            IsAutoGenerateVariables = request.IsAutoGeneratedVariable
        };

        var result = await sender.Send(command);
        return Results.Ok(result);
    }

    /// <summary>
    /// Switch active version of a template
    /// </summary>
    private static async Task<IResult> RegeneratePreview(ISender sender, HttpContext httpContext, string templateKey)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null) return Results.Unauthorized();

        var result = await sender.Send(new RegenerateTemplatePreviewCommand { TemplateKey = templateKey, UserId = userId.Value });
        return Results.Ok(result);
    }

    private static async Task<IResult> SwitchVersion(
        ISender sender,
        HttpContext httpContext,
        string templateKey,
        [FromBody] SwitchVersionRequest request)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var command = new SwitchTemplateVersionCommand
        {
            TemplateKey = templateKey,
            UserId = userId.Value,
            Version = request.Version
        };

        await sender.Send(command);
        return Results.NoContent();
    }

    /// <summary>
    /// Delete a template
    /// </summary>
    private static async Task<IResult> Delete(ISender sender, HttpContext httpContext, string templateKey)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var command = new DeleteTemplateCommand
        {
            TemplateKey = templateKey,
            UserId = userId.Value
        };

        await sender.Send(command);
        return Results.NoContent();
    }

    /// <summary>
    /// Download a template file (returns presigned URL)
    /// </summary>
    private static async Task<IResult> Download(
        HttpContext httpContext,
        IMinioStorageService storageService,
        IApplicationDbContext dbContext,
        IConfiguration configuration,
        string templateKey)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var template = await dbContext.Templates
            .Include(t => t.TemplateVersions.Where(tv => tv.Status == "active"))
            .FirstOrDefaultAsync(t => t.TemplateKey == templateKey && t.UserId == userId.Value);

        if (template == null)
        {
            return Results.NotFound();
        }

        var activeVersion = template.TemplateVersions.FirstOrDefault();
        if (activeVersion == null)
        {
            return Results.NotFound("No active version found");
        }

        var templateBucket = StorageAreas.Templates;
        var url = await storageService.GetPresignedUrlAsync(templateBucket, activeVersion.FilePath, 3600);

        return Results.Ok(new DownloadTemplateResponse { Url = url });
    }



    private static async Task<IResult> GenerateKey(ISender sender, HttpContext httpContext)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var query = new GenerateTemplateKeyQuery
        {
            UserId = userId.Value
        };

        var result = await sender.Send(query);
        return Results.Ok(result);
    }

    /// <summary>
    /// Returns sheet name → starting page number map for the active Excel template version.
    /// Non-Excel templates return an empty map.
    /// </summary>
    private static async Task<IResult> GetSheets(
        HttpContext httpContext,
        IMinioStorageService storageService,
        IApplicationDbContext dbContext,
        IConfiguration configuration,
        string templateKey)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null) return Results.Unauthorized();

        var template = await dbContext.Templates
            .Include(t => t.TemplateVersions.Where(tv => tv.Status == "active"))
            .FirstOrDefaultAsync(t => t.TemplateKey == templateKey && t.UserId == userId.Value);

        if (template == null) return Results.NotFound();

        var activeVersion = template.TemplateVersions.FirstOrDefault();
        if (activeVersion == null) return Results.NotFound("No active version found");

        var isExcel = activeVersion.FilePath.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase);
        if (!isExcel) return Results.Ok(new Dictionary<string, int>());

        try
        {
            var bucket = StorageAreas.Templates;
            using var xlsxStream = await storageService.DownloadFileAsync(bucket, activeVersion.FilePath);
            var sheetPageMap = ExcelGridlineHelper.GetSheetPageMap(xlsxStream);
            return Results.Ok(sheetPageMap);
        }
        catch
        {
            return Results.Ok(new Dictionary<string, int>());
        }
    }
}

/// <summary>
/// Request for template upload
/// </summary>
public class UploadTemplateRequest
{
    /// <summary>
    /// Template name
    /// </summary>
    [FromQuery(Name = "name")]
    public string? Name { get; set; }

    /// <summary>
    /// Optional custom template key
    /// </summary>
    [FromQuery(Name = "templateKey")]
    public string? TemplateKey { get; set; }

    /// <summary>
    /// Template file (.docx)
    /// </summary>
    [FromForm(Name = "file")]
    public IFormFile? File { get; set; }

    [FromQuery(Name = "project_id")]
    public Guid? ProjectId { get; set; }

    /// <summary>
    /// Whether to automatically generate variables from the document (default: true)
    /// </summary>
    [FromQuery(Name = "isAutoGeneratedVariable")]
    public bool IsAutoGeneratedVariable { get; set; } = true;
}

/// <summary>
/// Request body for importing a gallery template (JSON).
/// </summary>
public class ImportGalleryRequest
{
    /// <summary>Target project to import into (optional).</summary>
    public Guid? ProjectId { get; set; }

    /// <summary>Optional name override; defaults to the gallery template's name.</summary>
    public string? Name { get; set; }
}

/// <summary>
/// Request for template update
/// </summary>
public class UpdateTemplateRequest
{
    [FromQuery(Name = "name")]
    public string? Name { get; set; }
    [FromQuery(Name = "newTemplateKey")]
    public string? NewTemplateKey { get; set; }
    [FromQuery(Name = "status")]
    public string? Status { get; set; }
    [FromQuery(Name = "sandboxPayload")]
    public string? SandboxPayload { get; set; }
    [FromForm(Name = "file")]
    public IFormFile? File { get; set; }

    [FromQuery(Name = "project_id")]
    public Guid? ProjectId { get; set; }

    /// <summary>
    /// Whether to automatically generate variables from the document (default: true)
    /// </summary>
    [FromQuery(Name = "isAutoGeneratedVariable")]
    public bool IsAutoGeneratedVariable { get; set; } = true;
}

/// <summary>
/// Request for switching template version
/// </summary>
public class SwitchVersionRequest
{
    /// <summary>
    /// Version number to activate
    /// </summary>
    public int? Version { get; set; }
}

/// <summary>
/// Response for template download
/// </summary>
public class DownloadTemplateResponse
{
    /// <summary>
    /// Presigned URL for downloading the template
    /// </summary>
    public string Url { get; set; } = string.Empty;
}
