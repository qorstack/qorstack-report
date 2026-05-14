using System.Security.Claims;

namespace QorstackReportService.Web.Infrastructure;

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetUserId(this ClaimsPrincipal user)
    {
        var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
        {
            userIdClaim = user.FindFirst("id")?.Value;
        }

        if (string.IsNullOrEmpty(userIdClaim))
        {
            userIdClaim = user.FindFirst("sub")?.Value;
        }

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return null;
        }
        return userId;
    }
}
