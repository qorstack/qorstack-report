using System.Reflection;
using System.Text.RegularExpressions;

namespace QorstackReportService.Web.Infrastructure;

public static class WebApplicationExtensions
{
    public static RouteGroupBuilder MapGroup(this WebApplication app, EndpointGroupBase group)
    {
        var groupName = group.GetType().Name;

        groupName = groupName.Replace("EndpointGroup", string.Empty)
            .Replace("Endpoints", string.Empty)
            .Replace("Endpoint", string.Empty)
            .Replace("Controller", string.Empty);

        groupName = Regex
            .Replace(groupName, "(?<!^)([A-Z])", "-$1")
            .ToLowerInvariant();

        return app
            .MapGroup($"/{groupName}")
            .WithGroupName(groupName)
            .WithTags(groupName);
    }

    public static WebApplication MapEndpoints(this WebApplication app)
    {
        var endpointGroupType = typeof(EndpointGroupBase);

        var assembly = Assembly.GetExecutingAssembly();

        var endpointGroupTypes = assembly.GetExportedTypes()
            .Where(t => t.IsSubclassOf(endpointGroupType));

        foreach (var type in endpointGroupTypes)
        {
            if (Activator.CreateInstance(type) is EndpointGroupBase instance)
            {
                instance.Map(app);
            }
        }

        return app;
    }
}
