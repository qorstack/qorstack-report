using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.ExampleCategories.GetExampleCategoriesWithPagination;
using QorstackReportService.Application.ExampleCategories.GetExampleCategoryById;
using QorstackReportService.Application.ExampleCategories.CreateExampleCategory;
using QorstackReportService.Application.ExampleCategories.UpdateExampleCategory;
using QorstackReportService.Application.ExampleCategories.DeleteExampleCategory;

namespace QorstackReportService.Web.Endpoints;

public class Categories : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/example-categories")
            .WithTags("Example Categories");

        group.MapPost("/", Create)
             .Produces<int>(StatusCodes.Status201Created)
             .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapGet("/", GetAll)
             .Produces<PaginatedList<ExampleCategoryDto>>(StatusCodes.Status200OK);

        group.MapGet("/{id:int}", GetById)
             .WithName("GetExampleCategoryById")
             .Produces<ExampleCategoryDto>(StatusCodes.Status200OK)
             .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPut("/{id:int}", Update)
             .Produces(StatusCodes.Status204NoContent)
             .ProducesProblem(StatusCodes.Status400BadRequest)
             .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:int}", Delete)
             .Produces(StatusCodes.Status204NoContent)
             .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static async Task<IResult> GetAll(
        ISender sender,
        [AsParameters] GetExampleCategoriesWithPaginationQuery query)
    {
        var result = await sender.Send(query);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetById(ISender sender, int id)
    {
        var result = await sender.Send(new GetExampleCategoryByIdQuery { Id = id });
        return result is not null ? Results.Ok(result) : Results.NotFound();
    }

    private static async Task<IResult> Create(ISender sender, CreateExampleCategoryCommand command)
    {
        var id = await sender.Send(command);
        return Results.Created($"/api/categories/{id}", new { id });
    }

    private static async Task<IResult> Update(ISender sender, int id, UpdateExampleCategoryCommand command)
    {
        if (id != command.Id)
            return Results.BadRequest("The Category ID in the URL does not match the command.");
        await sender.Send(command);
        return Results.NoContent();
    }

    private static async Task<IResult> Delete(ISender sender, int id)
    {
        await sender.Send(new DeleteExampleCategoryCommand { Id = id });
        return Results.NoContent();
    }
}
