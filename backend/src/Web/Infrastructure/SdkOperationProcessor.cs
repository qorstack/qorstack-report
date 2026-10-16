using System.Text.Json.Nodes;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace QorstackReportService.Web.Infrastructure;

internal sealed class ApiKeyDocumentTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        document.Info = new()
        {
            Title = "Qorstack Report API",
            Description = "API for generating PDF reports from Word templates",
            Version = "1.0.0"
        };
        document.Components ??= new();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes.Add("ApiKey", new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.ApiKey,
            Name = "X-API-Key",
            In = ParameterLocation.Header,
            Description = "API Key authentication. Enter your API key in the format: rdx_xxxxx"
        });
        return Task.CompletedTask;
    }
}

internal sealed class ApiKeyOperationTransformer : IOpenApiOperationTransformer
{
    public Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken cancellationToken)
    {
        operation.Security ??= [];
        operation.Security.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference("ApiKey")] = []
        });
        return Task.CompletedTask;
    }
}

internal sealed class SdkOperationTransformer : IOpenApiOperationTransformer
{
    public Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken cancellationToken)
    {
        var hasSdkAttribute = context.Description.ActionDescriptor.EndpointMetadata
            .OfType<SwaggerSDKAttribute>().Any();

        if (hasSdkAttribute)
        {
            operation.Extensions ??= new Dictionary<string, IOpenApiExtension>();
            operation.Extensions["x-sdk-enabled"] = new JsonNodeExtension(JsonValue.Create(true)!);
        }

        return Task.CompletedTask;
    }
}

/// <summary>
/// Endpoints are served under <c>/api</c>. The document lists paths without that prefix and declares
/// <c>/api</c> as the server, so generated clients (SDKs, the web app) keep stable paths and only the
/// base URL carries the prefix (e.g. <c>http://localhost:8080/api</c>).
/// </summary>
internal sealed class ApiPrefixDocumentTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        var prefix = WebApplicationExtensions.ApiPrefix;
        var paths = new OpenApiPaths();
        foreach (var (path, item) in document.Paths)
            paths.Add(path.StartsWith(prefix + "/", StringComparison.Ordinal) ? path[prefix.Length..] : path, item);
        document.Paths = paths;
        document.Servers = [new OpenApiServer { Url = prefix }];
        return Task.CompletedTask;
    }
}
