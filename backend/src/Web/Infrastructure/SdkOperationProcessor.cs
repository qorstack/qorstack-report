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
