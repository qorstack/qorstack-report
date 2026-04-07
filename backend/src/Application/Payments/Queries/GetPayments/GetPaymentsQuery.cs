using QorstackReportService.Application.Common.Mappings;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.DTOs;

namespace QorstackReportService.Application.Payments.Queries.GetPayments;

/// <summary>
/// Query to get payment history for a user
/// </summary>
public class GetPaymentsQuery : IRequest<PaginatedList<PaymentDto>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

/// <summary>
/// Handler for GetPaymentsQuery
/// </summary>
public class GetPaymentsQueryHandler : IRequestHandler<GetPaymentsQuery, PaginatedList<PaymentDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public GetPaymentsQueryHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task<PaginatedList<PaymentDto>> Handle(GetPaymentsQuery request, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(_user.Id ?? throw new InvalidOperationException("User ID is required"));
        var query = _context.Payments
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedDatetime);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new PaymentDto
            {
                Id = p.Id,
                UserId = p.UserId,
                PackageId = p.PackageId,
                PlanId = p.PlanId,
                AmountMoney = p.AmountMoney,
                Currency = p.Currency,
                Status = p.Status,
                PaymentMethod = p.PaymentMethod,
                ExternalRef = p.ExternalRef,
                CreatedBy = p.CreatedBy,
                CreatedDatetime = p.CreatedDatetime,
                UpdatedBy = p.UpdatedBy,
                UpdatedDatetime = p.UpdatedDatetime
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<PaymentDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}
