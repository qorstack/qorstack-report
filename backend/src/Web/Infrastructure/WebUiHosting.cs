using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;

namespace QorstackReportService.Web.Infrastructure;

/// <summary>
/// Serves the web UI (the frontend's static export, copied into <c>wwwroot</c>) from the same origin as the API.
/// <list type="bullet">
/// <item><c>/api/*</c> is the API; unknown API paths return a JSON 404, never the web app.</item>
/// <item>Every other path is a web page: exact file → <c>{path}/index.html</c> → <c>{path}.html</c>.</item>
/// <item>Pages with an id in the URL (<c>/project/{id}/…</c>, <c>/pdf/templates/{key}</c>, <c>/excel/templates/{key}</c>) are
/// exported once with the placeholder id <c>_</c>; the real id is read from the URL in the browser
/// (see <c>useRouteParams</c> in the frontend). The same mapping serves the RSC payloads (<c>*.txt</c>) the
/// client router fetches.</item>
/// </list>
/// </summary>
public static class WebUiHosting
{
    public const string Placeholder = "_";

    /// <summary>Route prefixes whose next segment is an id (matches the frontend's [id] folders).</summary>
    private static readonly string[][] DynamicRoutes =
    [
        ["project"],
        ["pdf", "templates"],
        ["excel", "templates"]
    ];

    private static readonly FileExtensionContentTypeProvider ContentTypes = CreateContentTypes();

    private static FileExtensionContentTypeProvider CreateContentTypes()
    {
        var provider = new FileExtensionContentTypeProvider();
        provider.Mappings[".mjs"] = "text/javascript";
        provider.Mappings[".webmanifest"] = "application/manifest+json";
        provider.Mappings[".txt"] = "text/plain; charset=utf-8"; // RSC payloads of the static export
        return provider;
    }

    /// <summary>Content type for an exported file; Next writes some metadata images without an extension.</summary>
    private static string ContentTypeFor(string fileName) =>
        ContentTypes.TryGetContentType(fileName, out var type) ? type
        : fileName.EndsWith("-image", StringComparison.OrdinalIgnoreCase) ? "image/png"
        : "application/octet-stream";

    public static WebApplication UseWebUiStaticFiles(this WebApplication app)
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            ContentTypeProvider = ContentTypes,
            OnPrepareResponse = ctx => ApplyCacheHeaders(ctx.Context.Response, ctx.File.Name, ctx.Context.Request.Path)
        });
        return app;
    }

    /// <summary>Maps the API 404 and the web UI fallback. Call after <c>MapEndpoints</c>.</summary>
    public static WebApplication MapWebUiFallback(this WebApplication app)
    {
        app.MapFallback(WebApplicationExtensions.ApiPrefix + "/{**rest}",
                (HttpContext ctx) => Results.Problem(statusCode: StatusCodes.Status404NotFound, title: "Not Found",
                    detail: $"No API endpoint at {ctx.Request.Path}."))
            .AllowAnonymous();

        // Explicit catch-all: the default fallback pattern skips paths with a file extension (RSC *.txt payloads).
        app.MapFallback("{**path}", (HttpContext ctx, IWebHostEnvironment env) =>
            {
                var files = env.WebRootFileProvider;
                var resolved = Resolve(ctx.Request.Path.Value ?? "/", p => files.GetFileInfo(p) is { Exists: true, IsDirectory: false });
                if (resolved is null)
                {
                    var notFound = files.GetFileInfo("/404.html");
                    return notFound.Exists
                        ? Html(ctx, notFound, StatusCodes.Status404NotFound)
                        : Results.NotFound();
                }
                return Html(ctx, files.GetFileInfo(resolved), StatusCodes.Status200OK);
            })
            .AllowAnonymous();
        return app;
    }

    /// <summary>
    /// Finds the exported file for a web path, or null. Pure: <paramref name="exists"/> answers for web-root paths.
    /// </summary>
    public static string? Resolve(string path, Func<string, bool> exists)
    {
        if (string.IsNullOrEmpty(path)) path = "/";
        if (path.StartsWith(WebApplicationExtensions.ApiPrefix + "/", StringComparison.OrdinalIgnoreCase)) return null;
        if (path.Contains("..", StringComparison.Ordinal)) return null;

        foreach (var candidate in Candidates(path))
            if (exists(candidate)) return candidate;

        var mapped = MapDynamic(path);
        if (mapped != null)
            foreach (var candidate in Candidates(mapped))
                if (exists(candidate)) return candidate;

        return null;
    }

    private static IEnumerable<string> Candidates(string path)
    {
        var trimmed = path.TrimEnd('/');
        // RSC payloads requested by the client router: /a/b.txt or /a/b/index.txt
        if (trimmed.EndsWith(".txt", StringComparison.OrdinalIgnoreCase))
        {
            yield return trimmed;
            var stem = trimmed[..^4];
            if (stem.EndsWith("/index", StringComparison.OrdinalIgnoreCase)) stem = stem[..^6];
            yield return (stem.Length == 0 ? "" : stem) + "/index.txt";
            yield return stem + ".txt";
            yield break;
        }
        if (trimmed.Length == 0) { yield return "/index.html"; yield break; }
        yield return trimmed;
        yield return trimmed + "/index.html";
        yield return trimmed + ".html";
    }

    /// <summary>Replaces the id segment of a dynamic route with the placeholder.</summary>
    private static string? MapDynamic(string path)
    {
        var segments = path.Trim('/').Split('/');
        foreach (var route in DynamicRoutes)
        {
            if (segments.Length <= route.Length) continue;
            var match = true;
            for (var i = 0; i < route.Length; i++)
                if (!segments[i].Equals(route[i], StringComparison.OrdinalIgnoreCase)) { match = false; break; }
            if (!match) continue;

            var idIndex = route.Length;
            // "/project/abc.txt" → id segment carries the RSC suffix
            var id = segments[idIndex];
            var suffix = id.EndsWith(".txt", StringComparison.OrdinalIgnoreCase) ? ".txt" : "";
            segments[idIndex] = Placeholder + suffix;
            return "/" + string.Join('/', segments) + (path.EndsWith('/') ? "/" : "");
        }
        return null;
    }

    private static IResult Html(HttpContext ctx, IFileInfo file, int status)
    {
        ApplyCacheHeaders(ctx.Response, file.Name, ctx.Request.Path);
        return new ExportedFileResult(file, ContentTypeFor(file.Name), status);
    }

    /// <summary>Writes an exported file with an explicit status (200, or 404 for the not-found page).</summary>
    private sealed class ExportedFileResult(IFileInfo file, string contentType, int status) : IResult
    {
        public async Task ExecuteAsync(HttpContext httpContext)
        {
            httpContext.Response.StatusCode = status;
            httpContext.Response.ContentType = contentType;
            httpContext.Response.ContentLength = file.Length;
            if (HttpMethods.IsHead(httpContext.Request.Method)) return;
            await using var stream = file.CreateReadStream();
            await stream.CopyToAsync(httpContext.Response.Body, httpContext.RequestAborted);
        }
    }

    private static void ApplyCacheHeaders(HttpResponse response, string fileName, PathString requestPath)
    {
        if (requestPath.StartsWithSegments("/_next/static"))
            response.Headers.CacheControl = "public, max-age=31536000, immutable";
        else if (fileName.EndsWith(".html", StringComparison.OrdinalIgnoreCase) || fileName.EndsWith(".txt", StringComparison.OrdinalIgnoreCase))
            response.Headers.CacheControl = "no-cache";
    }
}
