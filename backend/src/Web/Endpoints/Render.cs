using MediatR;
using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.DTOs;
using QorstackReportService.Application.Reports.Commands.ExportPdf;
using QorstackReportService.Application.Reports.Commands.ExportExcel;
using QorstackReportService.Application.Reports.Commands.RenderWithSandboxPayload;
using QorstackReportService.Application.Reports.Models;
using QorstackReportService.Application.Reports.Queries.GetReportJobById;
using QorstackReportService.Application.Reports.Queries.GetReportJobsWithPagination;
using QorstackReportService.Web.Infrastructure;
using System.Text.Json.Nodes;
using System.Security.Claims;

namespace QorstackReportService.Web.Endpoints;

/// <summary>
/// API endpoints for rendering documents to PDF
/// </summary>
public class Render : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/render")
            .WithTags("Render")
            .RequireAuthorization();

        // Template-based Word/PDF generation
        group.MapPost("/word/template", RenderTemplatePdf)
            .BuildSwaggerSdk()
            .Produces<ExportPdfUrlResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("Render Word/PDF from stored template (returns link)")
            .WithDescription("Render a PDF or DOCX using a stored template. Supports variable replacement, tables, images, QR codes, and barcodes. Returns download link.");

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
            .Produces<ExportExcelUrlResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithSummary("Render Excel from stored template (returns link)")
            .WithDescription("Render an Excel file using a stored .xlsx template. Supports variable replacement, tables, images, QR codes, and barcodes. Can output as .xlsx or convert to PDF. Returns download link.");

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

        string fileName = request.FileName ?? Guid.NewGuid().ToString();

        var command = new ExportPdfCommand
        {
            UserId = userId.Value,
            TemplateKey = request.TemplateKey,
            Async = false,
            Data = MapToDocumentProcessingData(request, request.Table),
            FileType = request.FileType,
            ZipOutput = request.ZipOutput,
            PdfPassword = MapToPdfPasswordOptions(request.PdfPassword),
            Watermark = MapToPdfWatermarkOptions(request.Watermark)
        };

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
        [FromBody] JsonObject? request)
    {
        // Use JsonObject structure to preserve order
        return await ProcessTemplateSandboxPdf(sender, httpContext, templateKey, fileName, request);
    }

    private static async Task<IResult> ProcessTemplateSandboxPdf(
        ISender sender,
        HttpContext httpContext,
        string templateKey,
        string? fileName,
        JsonObject? request)
    {
        var userId = httpContext.User.GetUserId();
        if (userId == null)
        {
            return Results.Unauthorized();
        }

        if (request != null)
        {
            // Remove non-payload properties that might be in the request body
            request.Remove("templateKey");
            request.Remove("fileName");
            request.Remove("async");
        }

        var command = new RenderWithSandboxPayloadCommand
        {
            UserId = userId.Value,
            TemplateKey = templateKey,
            Async = false,
            FileName = fileName,
            SandboxPayload = request
        };

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
            Data = MapToDocumentProcessingData(request, request.Table),
            FileType = request.FileType,
            ZipOutput = request.ZipOutput,
            PdfPassword = MapToPdfPasswordOptions(request.PdfPassword),
            Watermark = MapToPdfWatermarkOptions(request.Watermark)
        };

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
            IsZipped = result.IsZipped
        });
    }

    #endregion

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

    #region Helper Methods

    private static DocumentProcessingData MapToDocumentProcessingData(DocumentProcessingRequestBase? request, IEnumerable<TableDataRequest>? tables = null)
    {
        if (request == null)
        {
            return new DocumentProcessingData();
        }

        var data = new DocumentProcessingData
        {
            Replace = request.Replace?.ToDictionary(k => k.Key, k => (string?)k.Value) ?? new Dictionary<string, string?>()
            // Condition removed
        };

        // Map tables (Index-based)
        if (tables != null)
        {
            data.Table = tables.Select(tableRequest =>
            {
                var td = new TableData
                {
                    Rows = tableRequest.Rows.Select(row =>
                        row.ToDictionary(k => k.Key, v => (object?)v.Value)
                    ).ToList(),
                    Sort = tableRequest.Sort,
                    VerticalMergeFields = tableRequest.VerticalMerge,
                    CollapseFields = tableRequest.Collapse,
                };

                if (tableRequest is WordTableDataRequest wt)
                {
                    td.RepeatHeader = wt.RepeatHeader;
                }
                else if (tableRequest is ExcelTableDataRequest et)
                {
                    td.AutoFilter = et.AutoFilter;
                    td.FreezeHeader = et.FreezeHeader;
                    td.AutoFitColumns = et.AutoFitColumns;
                    td.AsExcelTable = et.AsExcelTable;
                    td.ExcelTableStyle = et.ExcelTableStyle;
                    td.Outline = et.Outline;
                    td.GenerateTotals = et.GenerateTotals;
                    td.NumberFormat = et.NumberFormat;
                    td.ConditionalFormat = et.ConditionalFormat?.Select(cf => new ConditionalFormatConfig
                    {
                        Field = cf.Field,
                        Rules = cf.Rules.Select(r => new ConditionalFormatRule
                        {
                            Value = r.Value,
                            Operator = r.Operator,
                            FontColor = r.FontColor,
                            BackgroundColor = r.BackgroundColor,
                            Bold = r.Bold,
                            Italic = r.Italic
                        }).ToList()
                    }).ToList();
                    td.SplitToSheets = et.SplitToSheets != null
                        ? new SplitToSheetsConfig
                        {
                            Field = et.SplitToSheets.Field,
                            TemplateSheet = et.SplitToSheets.TemplateSheet
                        }
                        : null;
                }

                return td;
            }).ToList();
        }

        // Map images
        if (request.Image != null)
        {
            foreach (var (key, imageRequest) in request.Image)
            {
                data.Image[key] = new ImageData
                {
                    Src = imageRequest.Src,
                    Width = imageRequest.Width,
                    Height = imageRequest.Height,
                    ObjectFit = imageRequest.Fit ?? "contain"
                };
            }
        }

        // Map QR codes
        if (request.QrCode != null)
        {
            foreach (var (key, qrRequest) in request.QrCode)
            {
                data.Qrcode[key] = new QrCodeData
                {
                    Text = qrRequest.Text,
                    Size = qrRequest.Size,
                    Color = qrRequest.Color,
                    BackgroundColor = qrRequest.BackgroundColor,
                    Logo = qrRequest.Logo
                };
            }
        }

        // Map barcodes
        if (request.Barcode != null)
        {
            foreach (var (key, barcodeRequest) in request.Barcode)
            {
                data.Barcode[key] = new BarcodeData
                {
                    Text = barcodeRequest.Text,
                    Format = barcodeRequest.Format,
                    Width = barcodeRequest.Width,
                    Height = barcodeRequest.Height,
                    IncludeText = barcodeRequest.IncludeText,
                    Color = barcodeRequest.Color,
                    BackgroundColor = barcodeRequest.BackgroundColor
                };
            }
        }

        return data;
    }

    private static PdfPasswordOptions? MapToPdfPasswordOptions(PdfPasswordRequest? request)
    {
        if (request == null) return null;

        return new PdfPasswordOptions
        {
            UserPassword = request.UserPassword,
            OwnerPassword = request.OwnerPassword,
            RestrictPrinting = request.RestrictPrinting,
            RestrictCopying = request.RestrictCopying,
            RestrictModifying = request.RestrictModifying
        };
    }

    private static PdfWatermarkOptions? MapToPdfWatermarkOptions(PdfWatermarkRequest? request)
    {
        if (request == null) return null;

        return new PdfWatermarkOptions
        {
            Type = request.Type,
            Text = request.Text,
            ImageSrc = request.ImageSrc,
            FontSize = request.FontSize,
            FontFamily = request.FontFamily,
            Color = request.Color,
            Opacity = request.Opacity,
            Rotation = request.Rotation,
            PositionX = request.PositionX,
            PositionY = request.PositionY,
            Width = request.Width,
            Height = request.Height,
            Pages = request.Pages
        };
    }

    #endregion
}


