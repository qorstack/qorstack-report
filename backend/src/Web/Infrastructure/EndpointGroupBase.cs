namespace QorstackReportService.Web.Infrastructure;

public abstract class EndpointGroupBase
{
    /// <summary>Maps the group's endpoints. <paramref name="app"/> is the <c>/api</c> route group.</summary>
    public abstract void Map(IEndpointRouteBuilder app);
}
