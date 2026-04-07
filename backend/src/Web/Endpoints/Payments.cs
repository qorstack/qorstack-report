using MediatR;
using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.DTOs;
using QorstackReportService.Application.Payments.Commands.CreatePayment;
using QorstackReportService.Application.Payments.Queries.GetPayments;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

/// <summary>
/// API endpoints for payment management
/// </summary>
public class Payments : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/payments")
            .WithTags("Payments")
            .RequireAuthorization();

        group.MapPost("/", CreatePayment)
            .Produces<CreatePaymentResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .WithSummary("Create payment intent")
            .WithDescription("Create a new payment intent for purchasing credits.");

        group.MapGet("/", GetPayments)
            .Produces<PaginatedList<PaymentDto>>(StatusCodes.Status200OK)
            .WithSummary("Get payment history")
            .WithDescription("Retrieve payment history for the authenticated user.");
    }

    /// <summary>
    /// Create a new payment intent
    /// </summary>
    public async Task<IResult> CreatePayment(
        ISender sender,
        CreatePaymentCommand command,
        HttpContext context)
    {
        var result = await sender.Send(command);
        return Results.Created($"/payments/{result.PaymentId}", result);
    }

    /// <summary>
    /// Get payment history
    /// </summary>
    public async Task<IResult> GetPayments(
        ISender sender,
        [AsParameters] GetPaymentsQuery query)
    {
        var result = await sender.Send(query);
        return Results.Ok(result);
    }
}
