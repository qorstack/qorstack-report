namespace QorstackReportService.Application.DTOs
{
    public class SubscriptionDto
    {
        public required Guid Id { get; set; }
        public required Guid UserId { get; set; }
        public required Guid PlanId { get; set; }
        public string? Status { get; set; }
        public required DateTime CurrentPeriodStart { get; set; }
        public required DateTime CurrentPeriodEnd { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
