using QorstackReportService.Application.Common.Interfaces;
using MediatR.Pipeline;
using Microsoft.Extensions.Logging;

namespace QorstackReportService.Application.Common.Behaviours;

public class LoggingBehaviour<TRequest> : IRequestPreProcessor<TRequest> where TRequest : notnull
{
    private readonly ILogger _logger;
    private readonly IUser _user;
    // private readonly IIdentityService _identityService; // Commented out - not using Identity

    public LoggingBehaviour(ILogger<TRequest> logger, IUser user)
    // IIdentityService identityService) // Commented out - not using Identity
    {
        _logger = logger;
        _user = user;
        // _identityService = identityService; // Commented out - not using Identity
    }

    public Task Process(TRequest request, CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        var userId = _user.Id ?? string.Empty;
        string? userName = string.Empty; if (!string.IsNullOrEmpty(userId))
        {
            // userName = await _identityService.GetUserNameAsync(userId); // Commented out - not using Identity
            userName = userId; // Use userId as username since Identity is disabled
        }
        _logger.LogInformation("QorstackReportService Request: {Name} {@UserId} {@UserName} {@Request}",
            requestName, userId, userName, request);

        return Task.CompletedTask;
    }
}
