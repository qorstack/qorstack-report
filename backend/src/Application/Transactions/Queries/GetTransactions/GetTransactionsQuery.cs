using QorstackReportService.Application.Common.Mappings;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Transactions.Queries.GetTransactions;

/// <summary>
/// Query to get credit transaction history for a user
/// </summary>
public class GetTransactionsQuery : IRequest<PaginatedList<CreditTransactionDto>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

/// <summary>
/// Handler for GetTransactionsQuery
/// </summary>
public class GetTransactionsQueryHandler : IRequestHandler<GetTransactionsQuery, PaginatedList<CreditTransactionDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public GetTransactionsQueryHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task<PaginatedList<CreditTransactionDto>> Handle(GetTransactionsQuery request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(_user.Id, out var userId))
        {
            return new PaginatedList<CreditTransactionDto>(new List<CreditTransactionDto>(), 0, request.PageNumber, request.PageSize);
        }

        var query = _context.CreditTransactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedDatetime);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(t => new CreditTransactionDto
            {
                Id = t.Id,
                UserId = t.UserId,
                PaymentId = t.PaymentId,
                TransactionType = t.TransactionType,
                Amount = t.Amount,
                BalanceAfter = t.BalanceAfter,
                ReferenceId = t.ReferenceId,
                CreatedBy = t.CreatedBy,
                CreatedDatetime = t.CreatedDatetime
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<CreditTransactionDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}
