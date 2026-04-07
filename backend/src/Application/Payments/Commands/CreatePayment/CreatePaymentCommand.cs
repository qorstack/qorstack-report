using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Payments.Commands.CreatePayment;

/// <summary>
/// Command to create a new payment intent
/// </summary>
public class CreatePaymentCommand : IRequest<CreatePaymentResponse>
{
    /// <summary>
    /// Plan ID to purchase
    /// </summary>
    public Guid PlanId { get; set; }

    /// <summary>
    /// Payment method (e.g., "credit_card", "bank_transfer")
    /// </summary>
    public string PaymentMethod { get; set; } = null!;
}

/// <summary>
/// Response for payment creation
/// </summary>
public class CreatePaymentResponse
{
    /// <summary>
    /// Payment ID
    /// </summary>
    public Guid PaymentId { get; set; }

    /// <summary>
    /// Payment status
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// Amount to pay
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Currency
    /// </summary>
    public string Currency { get; set; } = null!;
}

/// <summary>
/// Handler for CreatePaymentCommand
/// </summary>
public class CreatePaymentCommandHandler : IRequestHandler<CreatePaymentCommand, CreatePaymentResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public CreatePaymentCommandHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task<CreatePaymentResponse> Handle(CreatePaymentCommand request, CancellationToken cancellationToken)
    {
        // Validate plan exists and is active
        var plan = await _context.Plans
            .FirstOrDefaultAsync(p => p.Id == request.PlanId && p.IsActive == true, cancellationToken);

        if (plan == null)
        {
            throw new NotFoundException("Plan", request.PlanId);
        }

        // Create payment record
        var userId = Guid.Parse(_user.Id ?? throw new InvalidOperationException("User ID is required"));
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PlanId = request.PlanId,
            AmountMoney = plan.Price ?? 0m,
            Currency = "THB", // Assuming Thai Baht
            PaymentMethod = request.PaymentMethod,
            Status = "pending",
            CreatedBy = userId.ToString(),
            CreatedDatetime = DateTime.UtcNow
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync(cancellationToken);

        return new CreatePaymentResponse
        {
            PaymentId = payment.Id,
            Status = payment.Status,
            Amount = payment.AmountMoney,
            Currency = payment.Currency
        };
    }
}
