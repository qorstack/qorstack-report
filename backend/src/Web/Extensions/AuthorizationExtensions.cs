using QorstackReportService.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace QorstackReportService.Web.Extensions;

public static class AuthorizationExtensions
{
    /// <summary>
    /// Adds authorization requirement for specific menu code and policies
    /// </summary>
    /// <param name="builder">The route handler builder</param>
    /// <param name="menuCode">The menu code to check permissions for</param>
    /// <param name="policies">The policies/actions required for access</param>
    /// <returns>The route handler builder for chaining</returns>
    public static TBuilder RequirePermission<TBuilder>(this TBuilder builder, string menuCode, params string[] policies)
        where TBuilder : IEndpointConventionBuilder
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var user = context.HttpContext.RequestServices.GetRequiredService<IUser>();

            // Must be authenticated user
            if (user.Id == null) throw new UnauthorizedAccessException();

            // For now, just check if user is authenticated
            // TODO: Implement proper authorization logic

            return await next(context);
        });
    }

    /// <summary>
    /// Adds authorization requirement for multiple menu codes with their respective policies
    /// </summary>
    /// <param name="builder">The route handler builder</param>
    /// <param name="menuPermissions">Array of tuples containing menu code and required policies</param>
    /// <returns>The route handler builder for chaining</returns>
    public static TBuilder RequirePermission<TBuilder>(this TBuilder builder, params (string menuCode, string[] policies)[] menuPermissions)
        where TBuilder : IEndpointConventionBuilder
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var user = context.HttpContext.RequestServices.GetRequiredService<IUser>();

            // Must be authenticated user
            if (user.Id == null) throw new UnauthorizedAccessException();

            // For now, just check if user is authenticated
            // TODO: Implement proper authorization logic

            return await next(context);
        });
    }
}
