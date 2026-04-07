using System.IO;
using System.Security;
using System.Security.Authentication;
using QorstackReportService.Application.Common.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace QorstackReportService.Web.Infrastructure;

public class CustomExceptionHandler : IExceptionHandler
{
    private readonly ILogger<CustomExceptionHandler> _logger;
    private readonly IConfiguration _configuration;
    private readonly Dictionary<Type, Func<HttpContext, Exception, Task>> _exceptionHandlers;

    public CustomExceptionHandler(ILogger<CustomExceptionHandler> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        _exceptionHandlers = new()
        {
            // ──────────────── 4xx Client Errors ──────────────── //
            // 400 Bad Request: input validation, missing/invalid arguments
            { typeof(ValidationException),           HandleValidationException },
            { typeof(BusinessValidationException),        HandleBusinessValidationException },
            { typeof(ArgumentException),             HandleBadRequestException },
            { typeof(ArgumentNullException),         HandleBadRequestException },
            { typeof(ArgumentOutOfRangeException),   HandleBadRequestException },
            { typeof(FormatException),               HandleBadRequestException },
            { typeof(InvalidOperationException),     HandleBadRequestException },
            { typeof(InvalidDataException),          HandleBadRequestException },
            { typeof(OverflowException),             HandleBadRequestException },

            // 401 Unauthorized: unauthenticated or authentication failed
            { typeof(UnauthorizedAccessException),   HandleUnauthorizedAccessException },
            { typeof(AuthenticationException),       HandleUnauthorizedAccessException },
            { typeof(SecurityException),             HandleUnauthorizedAccessException },

            // 402 Payment Required: insufficient credits/quota
            { typeof(PaymentRequiredException),      HandlePaymentRequiredException },

            // 403 Forbidden: Pro feature invoked without a valid license
            { typeof(ProFeatureRequiredException),    HandleProFeatureRequiredException },

            // 404 Not Found: resource not found in DB or collection
            { typeof(Application.Common.Exceptions.NotFoundException),             HandleNotFoundException },
            { typeof(KeyNotFoundException),          HandleNotFoundException },
            { typeof(FileNotFoundException),         HandleNotFoundException },
            { typeof(DirectoryNotFoundException),    HandleNotFoundException },

            // 405 Method Not Allowed: unsupported HTTP method
            { typeof(NotSupportedException),         HandleMethodNotAllowedException },

            // 408 Request Timeout: operation timed out (client-side)
            { typeof(TaskCanceledException),         HandleRequestTimeoutException },
            { typeof(OperationCanceledException),    HandleRequestTimeoutException },

            // 409 Conflict: concurrency conflict in EF Core
            { typeof(DbUpdateConcurrencyException),  HandleConcurrencyException },

            // ──────────────── 5xx Server Errors ────────────────
            // 500 Internal Server Error: general DB failures
            { typeof(DbUpdateException),             HandleDatabaseException },
            { typeof(InvalidCastException),          HandleInternalServerErrorException },
            { typeof(OutOfMemoryException),          HandleInternalServerErrorException },
            { typeof(StackOverflowException),        HandleInternalServerErrorException },
            { typeof(AccessViolationException),      HandleInternalServerErrorException },

            // 501 Not Implemented: stubbed or missing functionality
            { typeof(NotImplementedException),       HandleNotImplementedException },

            // 502 Bad Gateway: failure calling downstream HTTP service
            { typeof(HttpRequestException),          HandleBadGatewayException },

            // 503 Service Unavailable: service temporarily unavailable
            // { typeof(ServiceUnavailableException),   HandleServiceUnavailableException },

            // 504 Gateway Timeout: operation timed out
            { typeof(TimeoutException),              HandleGatewayTimeoutException },

            // Catch-all 500 for any other exceptions
            { typeof(Exception),                     HandleUnknownException },
        };
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var type = exception.GetType();

        // 1) Exact match
        if (_exceptionHandlers.TryGetValue(type, out var handler))
        {
            await handler(httpContext, exception);
            return true;
        }

        // 2) Base-type match (e.g. catching AuthenticationException via Exception key)
        foreach (var kv in _exceptionHandlers)
        {
            if (kv.Key.IsAssignableFrom(type))
            {
                await kv.Value(httpContext, exception);
                return true;
            }
        }

        return false;
    }

    // ──────────────── Helper Methods ───────────────────────────

    private Dictionary<string, object?>? GetExceptionExtensions(Exception ex)
    {
        var includeDetailMessage = _configuration.GetValue<bool>("ExceptionHandling:IncludeDetailMessage");
        return includeDetailMessage
            ? new Dictionary<string, object?> { { "exceptionStackTrace", ex.StackTrace } }
            : null;
    }

    // ──────────────── Handlers ───────────────────────────

    // 400
    private Task HandleValidationException(HttpContext ctx, Exception ex)
    {
        _logger.LogWarning(ex, "Validation failed");
        var exception = (ValidationException)ex;
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;

        if (exception.Errors.Any())
        {
            return ctx.Response.WriteAsJsonAsync(new ValidationProblemDetails(exception.Errors)
            {
                Status = StatusCodes.Status400BadRequest,
                Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1"
            });
        }

        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = exception.Message, // e.g. "USER_ALREADY_EXISTS"
            Detail = exception.EntityName, // e.g. "User with email ... already exists."
            Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }

    private Task HandleBusinessValidationException(HttpContext ctx, Exception ex)
    {
        _logger.LogWarning(ex, "Business validation failed");
        var exception = (BusinessValidationException)ex;
        ctx.Response.StatusCode = StatusCodes.Status409Conflict;

        var extensions = new Dictionary<string, object?>
        {
            ["entityName"] = exception.EntityName,
            ["errors"] = exception.Errors.Select(e => new { errorCode = e.ErrorCode, message = e.Message }).ToArray()
        };

        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Conflict - Business Validation Failed",
            Detail = ex.Message,
            Type = "https://tools.ietf.org/html/rfc7231#section-6.5.8",
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }

    private Task HandleBadRequestException(HttpContext ctx, Exception ex)
    {
        _logger.LogWarning(ex, "Bad request");
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Bad Request",
            Detail = ex.Message,
            Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }

    // 401
    private Task HandleUnauthorizedAccessException(HttpContext ctx, Exception ex)
    {
        _logger.LogWarning(ex, "Unauthorized access");
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status401Unauthorized,
            Title = "Unauthorized",
            Detail = ex.Message,
            Type = "https://tools.ietf.org/html/rfc7235#section-3.1",
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }

    // 402
    private Task HandlePaymentRequiredException(HttpContext ctx, Exception ex)
    {
        _logger.LogWarning(ex, "Payment required");
        ctx.Response.StatusCode = StatusCodes.Status402PaymentRequired;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status402PaymentRequired,
            Title = "Payment Required",
            Detail = ex.Message,
            Type = "https://tools.ietf.org/html/rfc7231#section-6.5.2",
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }


    // 403 — Pro feature not available; log at Information (not Warning/Error), it is expected
    private Task HandleProFeatureRequiredException(HttpContext ctx, Exception ex)
    {
        var typed = (ProFeatureRequiredException)ex;
        _logger.LogInformation("[Pro] Feature '{Feature}' requires a Pro license", typed.FeatureName);
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;

        return ctx.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = StatusCodes.Status403Forbidden,
            Title = "Pro License Required",
            Detail = ex.Message,
            Type = "https://tools.ietf.org/html/rfc7231#section-6.5.3",
            Extensions = new Dictionary<string, object?> { ["code"] = "PRO_REQUIRED" }
        });
    }

    // 404
    private Task HandleNotFoundException(HttpContext ctx, Exception ex)
    {
        _logger.LogWarning(ex, "Resource not found");
        ctx.Response.StatusCode = StatusCodes.Status404NotFound;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "Not Found",
            Detail = ex.Message,
            Type = "https://tools.ietf.org/html/rfc7231#section-6.5.4",
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }

    // 405
    private Task HandleMethodNotAllowedException(HttpContext ctx, Exception ex)
    {
        _logger.LogWarning(ex, "Method not allowed");
        ctx.Response.StatusCode = StatusCodes.Status405MethodNotAllowed;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status405MethodNotAllowed,
            Title = "Method Not Allowed",
            Detail = ex.Message,
            Type = "https://tools.ietf.org/html/rfc7231#section-6.5.5",
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }

    // 408
    private Task HandleRequestTimeoutException(HttpContext ctx, Exception ex)
    {
        _logger.LogWarning(ex, "Request timeout");
        ctx.Response.StatusCode = StatusCodes.Status408RequestTimeout;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status408RequestTimeout,
            Title = "Request Timeout",
            Detail = ex.Message,
            Type = "https://tools.ietf.org/html/rfc7231#section-6.5.7",
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }

    // 409
    private Task HandleConcurrencyException(HttpContext ctx, Exception ex)
    {
        _logger.LogWarning(ex, "Concurrency conflict");
        ctx.Response.StatusCode = StatusCodes.Status409Conflict;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Conflict",
            Detail = ex.Message,
            Type = "https://tools.ietf.org/html/rfc7231#section-6.5.8",
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }


    // 500
    private Task HandleDatabaseException(HttpContext ctx, Exception ex)
    {
        _logger.LogError(ex, "Database error");
        ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Database Error",
            Detail = ex.Message,
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }

    // 501
    private Task HandleNotImplementedException(HttpContext ctx, Exception ex)
    {
        _logger.LogError(ex, "Not implemented");
        ctx.Response.StatusCode = StatusCodes.Status501NotImplemented;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status501NotImplemented,
            Title = "Not Implemented",
            Detail = ex.Message,
            Type = "https://tools.ietf.org/html/rfc7231#section-6.6.2",
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }

    // 502
    private Task HandleBadGatewayException(HttpContext ctx, Exception ex)
    {
        _logger.LogError(ex, "Bad gateway");
        ctx.Response.StatusCode = StatusCodes.Status502BadGateway;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status502BadGateway,
            Title = "Bad Gateway",
            Detail = ex.Message,
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }

    // 504
    private Task HandleGatewayTimeoutException(HttpContext ctx, Exception ex)
    {
        _logger.LogError(ex, "Gateway timeout");
        ctx.Response.StatusCode = StatusCodes.Status504GatewayTimeout;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status504GatewayTimeout,
            Title = "Gateway Timeout",
            Detail = ex.Message,
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }

    // Catch-all 500
    private Task HandleUnknownException(HttpContext ctx, Exception ex)
    {
        _logger.LogError(ex, "Unhandled exception");
        ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "An unexpected error occurred",
            Detail = ex.Message,
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }

    // 500 - Internal Server Error for critical system exceptions
    private Task HandleInternalServerErrorException(HttpContext ctx, Exception ex)
    {
        _logger.LogError(ex, "Critical system error");
        ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;

        var extensions = GetExceptionExtensions(ex) ?? new Dictionary<string, object?>();
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Internal Server Error",
            Detail = "A critical system error occurred. Please contact support.",
            Type = "https://tools.ietf.org/html/rfc7231#section-6.6.1",
            Extensions = extensions
        };

        return ctx.Response.WriteAsJsonAsync(problemDetails);
    }
}
