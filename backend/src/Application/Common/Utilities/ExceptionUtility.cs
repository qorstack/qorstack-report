using System;
using System.Collections.Generic;
using System.IO;
using System.Security;
using System.Security.Authentication;
using QorstackReportService.Application.Common.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace QorstackReportService.Application.Common.Utilities;

public static class ExceptionUtility
{
    /// <summary>
    /// Determines if the provided exception is a known exception type.
    /// </summary>
    /// <param name="ex">The exception to check.</param>
    /// <returns>True if the exception is known; otherwise, false.</returns>
    public static bool IsKnownException(Exception ex)
    {
        return ex is QorstackReportService.Application.Common.Exceptions.ValidationException
            or ArgumentException
            or FormatException
            or InvalidDataException
            or OverflowException
            or UnauthorizedAccessException
            or AuthenticationException
            or SecurityException
            or KeyNotFoundException
            or FileNotFoundException
            or DirectoryNotFoundException
            or NotSupportedException
            or TaskCanceledException
            or OperationCanceledException
            or DbUpdateConcurrencyException
            or DbUpdateException
            or InvalidCastException
            or OutOfMemoryException
            or StackOverflowException
            or AccessViolationException
            or NotImplementedException
            or HttpRequestException
            or TimeoutException
            or System.ComponentModel.DataAnnotations.ValidationException
            or BusinessValidationException
            or NotFoundException
            or FileProcessingException
            or DocumentCreationException
            or EncryptionException
            or DataValidationException
            or RequiredDataMissingException
            or PaymentRequiredException;
    }

    /// <summary>
    /// Determines if the exception is related to infrastructure issues
    /// (database, network, I/O) that should not be treated as known client errors.
    /// </summary>
    /// <param name="ex">The exception to check.</param>
    /// <returns>True if the exception is infrastructure-related; otherwise, false.</returns>
    public static bool IsInfrastructureException(Exception ex)
    {
        if (ex == null) return false;

        var exceptionType = ex.GetType();
        var exceptionNamespace = exceptionType.Namespace ?? string.Empty;

        // Check for database-related exceptions
        if (exceptionNamespace.StartsWith("Npgsql") ||
            exceptionNamespace.StartsWith("Microsoft.EntityFrameworkCore") ||
            exceptionNamespace.StartsWith("System.Data"))
        {
            return true;
        }

        // Check for network-related exceptions
        if (exceptionType == typeof(TimeoutException) ||
            exceptionType == typeof(HttpRequestException) ||
            exceptionNamespace.StartsWith("System.Net"))
        {
            return true;
        }

        // Check inner exception recursively
        if (ex.InnerException != null)
        {
            return IsInfrastructureException(ex.InnerException);
        }

        return false;
    }
}
