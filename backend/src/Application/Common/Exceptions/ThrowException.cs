using QorstackReportService.Application.Common.Utilities;
using Microsoft.Extensions.Logging;

namespace QorstackReportService.Application.Common.Exceptions;

public class ThrowException : Exception
{
    public ThrowException(Exception originalException, Exception fallbackException, ILogger? logger) : base(GetMessage(originalException, fallbackException), originalException)
    {
        if (originalException == null) throw new ArgumentNullException(nameof(originalException));
        if (fallbackException == null) throw new ArgumentNullException(nameof(fallbackException));

        // If it's an infrastructure exception (DB, Network, etc.), we want to mask it with the fallback exception
        if (ExceptionUtility.IsInfrastructureException(originalException))
        {
            logger?.LogError(originalException, "Throwing fallback exception for infrastructure error: {Message}", fallbackException.Message);
            throw fallbackException;
        }

        // If it's a known domain/validation exception, re-throw it as is (preserving status codes)
        if (ExceptionUtility.IsKnownException(originalException))
        {
            throw originalException;
        }

        // For any other unknown exception, throw the fallback
        logger?.LogError(originalException, "Throwing fallback exception: {Message}", fallbackException.Message);
        throw fallbackException;
    }

    private static string GetMessage(Exception originalException, Exception fallbackException)
    {
        return $"Throw helper handling - Original: {originalException?.GetType().Name}, Fallback: {fallbackException?.GetType().Name}";
    }
}
