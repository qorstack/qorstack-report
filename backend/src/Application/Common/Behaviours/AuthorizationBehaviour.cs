using System.Reflection;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Security;

namespace QorstackReportService.Application.Common.Behaviours;

public class AuthorizationBehaviour<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull
{
    private readonly IUser _user;

    public AuthorizationBehaviour(IUser user)
    {
        _user = user;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        // Check if the request has any AuthorizeAttribute
        var authorizeAttributes = request.GetType().GetCustomAttributes<AuthorizeAttribute>();

        // If no AuthorizeAttribute is found, skip authorization
        if (authorizeAttributes.Any())
        {
            // Must be authenticated user
            if (_user.Id == null) throw new UnauthorizedAccessException();

            // For now, just check if user is authenticated
            // TODO: Implement proper authorization logic
        }

        // User is authorized / authorization not required
        return await next();
    }
}
