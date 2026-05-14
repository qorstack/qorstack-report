using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.ExampleProducts.GetExampleProductsWithPagination;
using QorstackReportService.Application.ExampleProducts.GetExampleProductById;
using QorstackReportService.Application.ExampleProducts.CreateExampleProduct;
using QorstackReportService.Application.ExampleProducts.UpdateExampleProduct;
using QorstackReportService.Application.ExampleProducts.DeleteExampleProduct;

namespace QorstackReportService.Web.Endpoints;

public class Products : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/example-products")
            .WithTags("Example Products");

        group.MapPost("/", Create)
             .Produces<int>(StatusCodes.Status201Created)
             .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapGet("/", GetAll)
             .Produces<PaginatedList<ExampleProductDto>>(StatusCodes.Status200OK);

        group.MapGet("/{id:int}", GetById)
             .WithName("GetExampleProductById")
             .Produces<ExampleProductDto>(StatusCodes.Status200OK)
             .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPut("/{id:int}", Update)
             .Produces(StatusCodes.Status204NoContent)
             .ProducesProblem(StatusCodes.Status400BadRequest)
             .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:int}", Delete)
             .Produces(StatusCodes.Status204NoContent)
             .ProducesProblem(StatusCodes.Status404NotFound);
    }

    private static async Task<IResult> Create(ISender sender, CreateExampleProductCommand command)
    {
        var id = await sender.Send(command);
        return Results.Created($"/api/products/{id}", new { id });
    }

    private static async Task<IResult> GetAll(
        ISender sender,
        [AsParameters] GetExampleProductsWithPaginationQuery query)
    {
        var result = await sender.Send(query);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetById(ISender sender, int id)
    {
        var result = await sender.Send(new GetExampleProductByIdQuery { Id = id });
        return result is not null ? Results.Ok(result) : Results.NotFound();
    }

    private static async Task<IResult> Update(ISender sender, int id, UpdateExampleProductCommand command)
    {
        if (id != command.Id)
            return Results.BadRequest("The Product ID in the URL does not match the command.");
        await sender.Send(command);
        return Results.NoContent();
    }

    private static async Task<IResult> Delete(ISender sender, int id)
    {
        await sender.Send(new DeleteExampleProductCommand { Id = id });
        return Results.NoContent();
    }
}
