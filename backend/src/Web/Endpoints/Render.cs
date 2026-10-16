using MediatR;
using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.DTOs;
using QorstackReportService.Application.Reports.Commands;
using QorstackReportService.Application.Reports.Commands.ExportPdf;
using QorstackReportService.Application.Reports.Commands.QueueRender;
using QorstackReportService.Application.Reports.Commands.ExportExcel;
using QorstackReportService.Application.Reports.Commands.RenderWithSandboxPayload;
using QorstackReportService.Application.Reports.Models;
using QorstackReportService.Application.Reports.Queries.GetReportJobById;
using QorstackReportService.Application.Reports.Queries.GetReportJobsWithPagination;
using QorstackReportService.Web.Infrastructure;
using System.Text.Json.Nodes;
using FluentValidation.Results;
using QorstackReportService.Application.Common.Exceptions;
using System.Security.Claims;

namespace QorstackReportService.Web.Endpoints;

/// <summary>
/// API endpoints for rendering documents to PDF
/// </summary>
public class Render : EndpointGroupBase
{
    public override void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/render")
            .WithTags("Render")
            .RequireAuthorization();

        // Template-based Word/PDF generation
        var bodyLimit = new RenderBodySizeLimit(app.ServiceProvider.GetRequiredService<IConfiguration>());

        group.MapPost("/word/template", RenderTemplatePdf)
            .BuildSwaggerSdk()
            .WithMetadata(bodyLimit)
            .Produces<ExportPdfUrlResponse>(StatusCodes.Status200OK)
            .Produces<ExportPdfAsyncResponse>(StatusCodes.Status202Accepted)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status429TooManyRequests)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("Render Word/PDF from stored template (returns link)")
            .WithDescription("Render a PDF or DOCX from a stored Word template. Supports variable replacement, tables, images, QR codes and barcodes. Set templateVersion to render an older stored version. Returns a download link (200), or with \"async\": true (Pro) a job to poll (202).");

        // Template-based PDF generation using sandbox payload
        group.MapPost("/word/template-sandbox/{templateKey}", RenderTemplateSandboxPdf)
            .Produces<ExportPdfUrlResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("Render PDF from template using sandbox payload (returns link)")
            .WithDescription("Render a PDF using a stored template with its configured sandbox payload. Returns download link.");

        // Excel template-based generation
        group.MapPost("/excel/template", RenderTemplateExcel)
            .BuildSwaggerSdk()
            .WithMetadata(bodyLimit)
            .Produces<ExportExcelUrlResponse>(StatusCodes.Status200OK)
            .Produces<ExportPdfAsyncResponse>(StatusCodes.Status202Accepted)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status429TooManyRequests)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("Render Excel from stored template (returns link)")
            .WithDescription("Render an .xlsx file from a stored .xlsx template (Excel in, Excel out). Supports variable replacement, tables, images, QR codes and barcodes. Set templateVersion to render an older stored version. Returns a download link (200), or with \"async\": true (Pro) a job to poll (202).");

        // Job management endpoints
        group.MapGet("/jobs", GetJobs)
            .Produces<PaginatedList<ReportJobDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .WithSummary("Get render jobs with pagination")
            .WithDescription("Get a list of render jobs with pagination and filtering options.");

        group.MapGet("/jobs/{id:guid}", GetJobById)
            .WithName("GetRenderJobById")
            .Produces<ReportJobDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .WithSummary("Get render job by ID")
            .WithDescription("Get details of a specific render job by its ID.");
    }

    /// <summary>ZIP output is a Pro feature (flag DownloadAsZip).</summary>
    private static bool RequireZipFeature(HttpContext httpContext, bool zipOutput)
    {
        if (zipOutput && !httpContext.RequestServices.GetRequiredService<QorstackReportService.Application.Common.Interfaces.IFeatureFlagService>().DownloadAsZip)
            throw new QorstackReportService.Application.Common.Exceptions.ProFeatureRequiredException("ZIP output");
        return zipOutput;
    }

    #region Template-based PDF Endpoints

    /// <summary>
    /// Render PDF from stored template (returns link)
    /// </summary>
    private static async Task<IResult> RenderTemplatePdf(
        ISender sender,
        HttpContext httpContext,
        [FromBody] PdfFromTemplateRequest request)
    {
        return await ProcessTemplatePdf(sender, httpContext, request);
    }

    private static async Task<IResult> ProcessTemplatePdf(
        ISender sender,
        HttpContext httpContext,
        PdfFromTemplateRequest request)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        // Validate template key
        if (string.IsNullOrEmpty(request.TemplateKey))
        {
            return Results.BadRequest("Template key is required");
        }

        var command = new ExportPdfCommand
        {
            UserId = userId.Value,
            TemplateKey = request.TemplateKey,
            Async = false,
            TemplateVersion = request.TemplateVersion,
            Data = RenderRequestMapper.ToDocumentProcessingData(request, httpContext.RequestServices.GetRequiredService<Microsoft.Extensions.Options.IOptions<RenderLimits>>().Value),
            FileType = request.FileType.ToLowerInvariant(),
            FileName = request.FileName,
            ZipOutput = RequireZipFeature(httpContext, request.ZipOutput),
            PdfPassword = RenderRequestMapper.ToPdfPasswordOptions(request.PdfPassword),
            Watermark = RenderRequestMapper.ToPdfWatermarkOptions(request.Watermark)
        };

        if (request.Async)
            return await QueueAsync(sender, command, request.WebhookUrl);

        var result = await sender.Send(command);

        // Handle failed result
        if (result.Status == "failed")
        {
            return Results.Problem(
                title: "PDF Rendering Failed",
                detail: result.ErrorMessage,
                statusCode: StatusCodes.Status500InternalServerError);
        }

        return Results.Ok(new ExportPdfUrlResponse
        {
            JobId = result.JobId,
            DownloadUrl = result.DownloadUrl,
            ExpiresIn = result.ExpiresIn ?? 3600,
            Status = result.Status,
            FileType = result.FileType,
            IsZipped = result.IsZipped
        });
    }

    #endregion

    #region Template Sandbox Payload PDF Endpoints

    /// <summary>
    /// Render PDF from template using sandbox payload (returns link)
    /// </summary>
    private static async Task<IResult> RenderTemplateSandboxPdf(
        ISender sender,
        HttpContext httpContext,
        string templateKey,
        [FromQuery] string? fileName,
        [FromBody] JsonObject? request,
        CancellationToken cancellationToken)
    {
        // Use JsonObject structure to preserve order
        return await ProcessTemplateSandboxPdf(sender, httpContext, templateKey, fileName, request, cancellationToken);
    }

    private static async Task<IResult> ProcessTemplateSandboxPdf(
        ISender sender,
        HttpContext httpContext,
        string templateKey,
        string? fileName,
        JsonObject? request,
        CancellationToken cancellationToken)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        bool zipOutput = false;
        if (request != null)
        {
            // Remove non-payload properties that might be in the request body
            request.Remove("templateKey");
            request.Remove("fileName");
            request.Remove("async");
            if (request.TryGetPropertyValue("zipOutput", out var zipNode))
            {
                zipOutput = zipNode?.GetValue<bool>() ?? false;
                request.Remove("zipOutput");
            }
        }

        var command = new RenderWithSandboxPayloadCommand
        {
            UserId = userId.Value,
            TemplateKey = templateKey,
            Async = false,
            FileName = fileName,
            ZipOutput = RequireZipFeature(httpContext, zipOutput),
            SandboxPayload = request
        };

        var result = await sender.Send(command, cancellationToken);

        // Handle failed result
        if (result.Status == "failed")
        {
            return Results.Problem(
                title: "PDF Rendering Failed",
                detail: result.ErrorMessage,
                statusCode: StatusCodes.Status500InternalServerError);
        }

        return Results.Ok(new ExportPdfUrlResponse
        {
            JobId = result.JobId,
            DownloadUrl = result.DownloadUrl,
            ExpiresIn = result.ExpiresIn ?? 3600,
            Status = result.Status,
            FileType = result.FileType,
            IsZipped = result.IsZipped
        });
    }

    #endregion

    #region Excel-based Endpoints

    /// <summary>
    /// Render Excel from stored template (returns link)
    /// </summary>
    private static async Task<IResult> RenderTemplateExcel(
        ISender sender,
        HttpContext httpContext,
        [FromBody] ExcelFromTemplateRequest request)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        if (string.IsNullOrEmpty(request.TemplateKey))
        {
            return Results.BadRequest("Template key is required");
        }

        var command = new ExportExcelCommand
        {
            UserId = userId.Value,
            TemplateKey = request.TemplateKey,
            Async = false,
            TemplateVersion = request.TemplateVersion,
            Data = RenderRequestMapper.ToDocumentProcessingData(request, httpContext.RequestServices.GetRequiredService<Microsoft.Extensions.Options.IOptions<RenderLimits>>().Value),
            ZipOutput = RequireZipFeature(httpContext, request.ZipOutput),
            FileName = request.FileName,
            // The builder renders the current version and keeps its sandbox (payload + preview PDF) up to date.
            // A request for an older version must not overwrite that.
            // Only the logged-in builder keeps the template's saved test data up to date; API-key callers
            // (integrations) must never overwrite it.
            IsSandbox = request.TemplateVersion is null && !request.Async
                && httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.AuthenticationMethod)?.Value != "ApiKey",
            SandboxGeneratePdfPreview = request.TemplateVersion is null && !request.ZipOutput && !request.Async
                && httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.AuthenticationMethod)?.Value != "ApiKey"
        };

        if (request.Async)
            return await QueueAsync(sender, command, request.WebhookUrl);

        var result = await sender.Send(command);

        if (result.Status == "failed")
        {
            return Results.Problem(
                title: "Excel Rendering Failed",
                detail: result.ErrorMessage,
                statusCode: StatusCodes.Status500InternalServerError);
        }

        return Results.Ok(new ExportExcelUrlResponse
        {
            JobId = result.JobId,
            DownloadUrl = result.DownloadUrl,
            ExpiresIn = result.ExpiresIn ?? 3600,
            Status = result.Status,
            FileType = result.FileType,
            IsZipped = result.IsZipped,
            PdfPreviewUrl = result.PdfPreviewUrl,
            SheetPageMap = result.SheetPageMap,
            SheetPdfUrlMap = result.SheetPdfUrlMap
        });
    }

    #endregion

    /// <summary>Pro: queue the render and answer 202 with the job to poll.</summary>
    private static async Task<IResult> QueueAsync(ISender sender, IRenderJobCommand command, string? webhookUrl)
    {
        var queued = await sender.Send(new QueueRenderCommand { Render = command, WebhookUrl = webhookUrl });
        return Results.Accepted(queued.StatusUrl, queued);
    }

    #region Job Management Endpoints

    /// <summary>
    /// Get render jobs with pagination
    /// </summary>
    private static async Task<IResult> GetJobs(
        ISender sender,
        HttpContext httpContext,
        [FromQuery] string? templateKey,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var query = new GetReportJobsWithPaginationQuery
        {
            UserId = userId.Value,
            TemplateKey = templateKey,
            Status = status,
            FromDate = fromDate,
            ToDate = toDate,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await sender.Send(query);
        return Results.Ok(result);
    }

    /// <summary>
    /// Get a render job by ID
    /// </summary>
    private static async Task<IResult> GetJobById(ISender sender, HttpContext httpContext, Guid id)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        var query = new GetReportJobByIdQuery
        {
            Id = id,
            UserId = userId.Value
        };

        var result = await sender.Send(query);
        return result is not null ? Results.Ok(result) : Results.NotFound();
    }

    #endregion
}

/// <summary>Request body limit for render POSTs from Render:MaxBodyMb (env RENDER_MAX_BODY_MB, default 30, 0 = unlimited).</summary>
internal sealed class RenderBodySizeLimit : Microsoft.AspNetCore.Http.Metadata.IRequestSizeLimitMetadata
{
    public RenderBodySizeLimit(IConfiguration configuration)
    {
        var mb = configuration.GetValue($"{RenderLimits.SectionName}:{nameof(RenderLimits.MaxBodyMb)}", RenderLimits.Default.MaxBodyMb);
        MaxRequestBodySize = mb > 0 ? mb * 1024L * 1024L : null;
    }

    public long? MaxRequestBodySize { get; }
}
