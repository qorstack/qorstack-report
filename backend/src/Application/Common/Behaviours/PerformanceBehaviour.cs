using System.Diagnostics;
using QorstackReportService.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace QorstackReportService.Application.Common.Behaviours;

public class PerformanceBehaviour<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    private readonly Stopwatch _timer;
    private readonly ILogger<TRequest> _logger;
    private readonly IUser _user;
    // private readonly IIdentityService _identityService; // Commented out - not using Identity

    public PerformanceBehaviour(
        ILogger<TRequest> logger,
        IUser user)
    // IIdentityService identityService) // Commented out - not using Identity
    {
        _timer = new Stopwatch();

        _logger = logger;
        _user = user;
        // _identityService = identityService; // Commented out - not using Identity
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        _timer.Start();

        var response = await next();

        _timer.Stop();

        var elapsedMilliseconds = _timer.ElapsedMilliseconds;

        if (elapsedMilliseconds > 500)
        {
            var requestName = typeof(TRequest).Name;
            var userId = _user.Id ?? string.Empty;
            var userName = string.Empty; if (!string.IsNullOrEmpty(userId))
            {
                // userName = await _identityService.GetUserNameAsync(userId); // Commented out - not using Identity
                userName = userId; // Use userId as username since Identity is disabled
            }

            _logger.LogWarning("QorstackReportService Long Running Request: {Name} ({ElapsedMilliseconds} milliseconds) {@UserId} {@UserName} {@Request}",
                requestName, elapsedMilliseconds, userId, userName, request);
        }

        return response;
    }
}
