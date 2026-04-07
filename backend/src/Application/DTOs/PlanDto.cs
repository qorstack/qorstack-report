namespace QorstackReportService.Application.DTOs
{
    public class PlanDto
    {
        public required Guid Id { get; set; }
        public required string Name { get; set; }
        public required string Code { get; set; }
        public decimal? Price { get; set; }
        public string? Currency { get; set; }
        public required string FeaturesConfig { get; set; }
        public bool? IsShow { get; set; }
        public int? DisplayOrder { get; set; }
        public bool? IsActive { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
