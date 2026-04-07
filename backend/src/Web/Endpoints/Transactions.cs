using MediatR;
using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.DTOs;
using QorstackReportService.Application.Transactions.Queries.GetTransactions;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

/// <summary>
/// API endpoints for transaction management
/// </summary>
public class Transactions : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        var group = app.MapGroup("/transactions")
            .WithTags("Transactions")
            .RequireAuthorization();

        group.MapGet("/", GetTransactions)
            .Produces<PaginatedList<CreditTransactionDto>>(StatusCodes.Status200OK)
            .WithSummary("Get credit transaction history")
            .WithDescription("Retrieve credit transaction history for the authenticated user.");
    }

    /// <summary>
    /// Get credit transaction history
    /// </summary>
    public async Task<IResult> GetTransactions(
        ISender sender,
        [AsParameters] GetTransactionsQuery query)
    {
        var result = await sender.Send(query);
        return Results.Ok(result);
    }
}
