using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace QorstackReportService.Web.Infrastructure;

public static class RouteHandlerBuilderExtensions
{
    public static RouteHandlerBuilder BuildSwaggerSdk(this RouteHandlerBuilder builder)
    {
        return builder.WithMetadata(new SwaggerSDKAttribute());
    }
}
