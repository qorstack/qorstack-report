using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Scalar.AspNetCore;
using QorstackReportService.Web.Middleware;
#if HAS_PRO
using QorstackReportService.Infrastructure.Pro;
#endif
using System.Globalization;
using QorstackReportService.Application.Common.Utilities;
using QorstackReportService.Infrastructure.Data.Converters;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Console;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

// Set the default timezone to UTC to ensure consistent date/time formatting
TimeZoneInfo.ClearCachedData();
CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;
CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.InvariantCulture;

Console.OutputEncoding = System.Text.Encoding.UTF8;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
//builder.Services.AddKeyVaultIfConfigured(builder.Configuration);

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
#if HAS_PRO
builder.Services.AddQorstackProServices(builder.Configuration);
#endif
builder.Services.AddWebServices(builder.Configuration);
builder.Services.AddAntiforgery();

// Configure OpenTelemetry
var otlpEndpoint = builder.Configuration["OpenTelemetry:OtlpEndpoint"];
var serviceName = builder.Configuration["OpenTelemetry:ServiceName"] ?? "eec-id-service";
var serviceVersion = builder.Configuration["OpenTelemetry:ServiceVersion"] ?? "1.0.0";

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService(serviceName: serviceName, serviceVersion: serviceVersion))
    .WithLogging(logging => logging
        .AddOtlpExporter(options =>
        {
            if (!string.IsNullOrEmpty(otlpEndpoint))
            {
                options.Endpoint = new Uri(otlpEndpoint);
            }
        }))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter(options =>
        {
            if (!string.IsNullOrEmpty(otlpEndpoint))
            {
                options.Endpoint = new Uri(otlpEndpoint);
            }
        }));

// Configure logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddOpenTelemetry(options =>
{
    options.IncludeFormattedMessage = true;
    options.IncludeScopes = true;
});

var app = builder.Build();

// Set service provider for encryption
EncryptedStringConverter.SetServiceProvider(app.Services);


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    //await app.InitialiseDatabaseAsync();
}
else
{
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}



// Only redirect to HTTPS in production
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Security headers (before any response is sent)
app.UseSecurityHeaders();

app.UseCors("AllowDevelopmentOrigins");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.UseStaticFiles();
app.UseAntiforgery();

app.MapOpenApi();
app.MapScalarApiReference(options =>
{
    options.AddApiKeyAuthentication("ApiKey", scheme =>
    {
        scheme.WithName("X-API-Key");
    });
    options.WithJavaScriptConfiguration("/scalar-config.js");
});

app.MapControllerRoute(
    name: "default",
    pattern: "{controller}/{action=Index}/{id?}");

app.MapFallbackToFile("index.html");

app.UseExceptionHandler(options => { });

app.Map("/", () => Results.Redirect("/scalar/v1"));

app.MapEndpoints();

app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                exception = e.Value.Exception?.Message,
                duration = e.Value.Duration.ToString()
            })
        };
        await System.Text.Json.JsonSerializer.SerializeAsync(context.Response.Body, response);
    }
})
.AllowAnonymous()
.RequireCors("AllowDevelopmentOrigins");

app.Run();

public partial class Program { }
