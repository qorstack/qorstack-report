using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Settings.Commands.UpdateProfile;
using QorstackReportService.Application.Settings.Models;
using QorstackReportService.Application.Settings.Queries.GetProfile;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

public class Settings : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/settings")
            .RequireAuthorization()
            .WithTags("Settings");

        group.MapGet("/profile", GetProfile)
            .Produces<ProfileDto>(StatusCodes.Status200OK);

        group.MapPut("/profile", UpdateProfile)
            .Produces(StatusCodes.Status204NoContent);
    }

    public async Task<IResult> GetProfile(ISender sender)
    {
        var result = await sender.Send(new GetProfileQuery());
        return Results.Ok(result);
    }

    public async Task<IResult> UpdateProfile(ISender sender, [FromBody] UpdateProfileRequest request)
    {
        await sender.Send(new UpdateProfileCommand(request.FirstName, request.LastName, request.ProfileImageUrl));
        return Results.NoContent();
    }
}
