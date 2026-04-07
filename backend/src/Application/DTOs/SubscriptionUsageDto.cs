namespace QorstackReportService.Application.DTOs
{
    public class SubscriptionUsageDto
    {
        public required Guid Id { get; set; }
        public required Guid SubscriptionId { get; set; }
        public required string FeatureKey { get; set; }
        public required int UsedQuantity { get; set; }
        public DateTime? LastUpdated { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
