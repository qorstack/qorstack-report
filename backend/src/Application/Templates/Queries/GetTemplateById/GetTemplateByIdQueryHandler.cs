using System.Text.Json;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Templates.Models;

namespace QorstackReportService.Application.Templates.Queries.GetTemplateById;

/// <summary>
/// Handler for GetTemplateByIdQuery
/// </summary>
public class GetTemplateByIdQueryHandler : IRequestHandler<GetTemplateByIdQuery, TemplateDetailResponse?>
{
    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storageService;
    private readonly IConfiguration _configuration;

    public GetTemplateByIdQueryHandler(
        IApplicationDbContext context,
        IMinioStorageService storageService,
        IConfiguration configuration)
    {
        _context = context;
        _storageService = storageService;
        _configuration = configuration;
    }

    public async Task<TemplateDetailResponse?> Handle(GetTemplateByIdQuery request, CancellationToken cancellationToken)
    {
        var template = await _context.Templates
            .Include(t => t.TemplateVersions)
            .Where(t => t.TemplateKey == request.TemplateKey && t.UserId == request.UserId)
            .Select(t => new TemplateDetailResponse
            {
                Id = t.Id,
                UserId = t.UserId,
                TemplateKey = t.TemplateKey,
                Name = t.Name,
                // Use active version payload
                SandboxPayload = t.TemplateVersions
                    .Where(v => v.Status == "active")
                    .OrderByDescending(v => v.Version)
                    .Select(v => v.SandboxPayload)
                    .FirstOrDefault(),
                ProjectId = t.ProjectId,
                ActiveVersion = t.TemplateVersions
                    .Where(v => v.Status == "active")
                    .OrderByDescending(v => v.Version)
                    .Select(v => new TemplateVersionResponse
                    {
                        Id = v.Id,
                        TemplateId = v.TemplateId,
                        Version = v.Version,
                        FilePath = v.FilePath,
                        PreviewFilePath = v.PreviewFilePath,
                        SandboxFilePath = v.SandboxFilePath,
                        Status = v.Status,
                        CreatedBy = v.CreatedBy,
                        CreatedDatetime = v.CreatedDatetime
                    })
                    .FirstOrDefault(),
                AllVersions = t.TemplateVersions
                    .OrderByDescending(v => v.Version)
                    .Select(v => new TemplateVersionResponse
                    {
                        Id = v.Id,
                        TemplateId = v.TemplateId,
                        Version = v.Version,
                        FilePath = v.FilePath,
                        PreviewFilePath = v.PreviewFilePath,
                        SandboxFilePath = v.SandboxFilePath,
                        Status = v.Status,
                        CreatedBy = v.CreatedBy,
                        CreatedDatetime = v.CreatedDatetime
                    })
                    .ToList(),
                CreatedBy = t.CreatedBy,
                CreatedDatetime = t.CreatedDatetime,
                UpdatedBy = t.UpdatedBy,
                UpdatedDatetime = t.UpdatedDatetime
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (template == null)
        {
            return null;
        }

        var templateBucket = _configuration["Minio:TemplateBucket"] ?? "templates";

        if (template.ActiveVersion != null)
        {
            try
            {
                // Preview file presigned URL
                if (!string.IsNullOrEmpty(template.ActiveVersion.PreviewFilePath))
                {
                    template.ActiveVersion.PreviewFilePathPresigned = await _storageService.GetPresignedUrlAsync(
                        templateBucket,
                        template.ActiveVersion.PreviewFilePath,
                        3600); // 1 hour expiry
                }
            }
            catch
            {
                // Ignore errors getting presigned URL
            }
        }

        // Get presigned URLs for all versions
        foreach (var version in template.AllVersions.Where(v => !string.IsNullOrEmpty(v.PreviewFilePath)))
        {
            try
            {
                version.PreviewFilePathPresigned = await _storageService.GetPresignedUrlAsync(
                    templateBucket,
                    version.PreviewFilePath!,
                    3600);
            }
            catch
            {
                // Ignore errors
            }
        }

        var reportBucket = _configuration["Minio:ReportBucket"] ?? "reports";

        // Sandbox Last Test Presigned URL
        // Use version specific sandbox path if available
        if (template.ActiveVersion != null && !string.IsNullOrEmpty(template.ActiveVersion.SandboxFilePath))
        {
             try
            {
                if (await _storageService.FileExistsAsync(reportBucket, template.ActiveVersion.SandboxFilePath))
                {
                    template.FileSandboxLastTestPresigned = await _storageService.GetPresignedUrlAsync(
                        reportBucket,
                        template.ActiveVersion.SandboxFilePath,
                        3600);
                }
            }
            catch
            {
                // Ignore errors
            }
        }


        // Resolve minio: paths in SandboxPayload to presigned URLs
        if (!string.IsNullOrEmpty(template.SandboxPayload))
        {
            template.SandboxPayload = await ResolveMinioPathsInJsonAsync(template.SandboxPayload);
        }

        return template;
    }

    private async Task<string> ResolveMinioPathsInJsonAsync(string json)
    {
        // Parse → walk → resolve → reserialize to avoid breaking JSON with special chars in presigned URLs
        using var doc = JsonDocument.Parse(json);
        var resolved = await ResolveMinioPathsInElementAsync(doc.RootElement);
        return JsonSerializer.Serialize(resolved, new JsonSerializerOptions { WriteIndented = false });
    }

    private async Task<object?> ResolveMinioPathsInElementAsync(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var dict = new Dictionary<string, object?>();
                foreach (var prop in element.EnumerateObject())
                {
                    dict[prop.Name] = await ResolveMinioPathsInElementAsync(prop.Value);
                }
                return dict;

            case JsonValueKind.Array:
                var list = new List<object?>();
                foreach (var item in element.EnumerateArray())
                {
                    list.Add(await ResolveMinioPathsInElementAsync(item));
                }
                return list;

            case JsonValueKind.String:
                var str = element.GetString();
                if (str != null && str.StartsWith("minio:", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        return await _storageService.ResolveMinioPathAsync(str, 3600);
                    }
                    catch
                    {
                        return str;
                    }
                }
                return str;

            case JsonValueKind.Number:
                return element.TryGetInt64(out var l) ? l : element.GetDouble();

            case JsonValueKind.True:
                return true;

            case JsonValueKind.False:
                return false;

            default:
                return null;
        }
    }
}
