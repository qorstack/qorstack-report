namespace QorstackReportService.Application.DTOs
{
    public class CreditPackageDto
    {
        public required Guid Id { get; set; }
        public required string Name { get; set; }
        public required int Credits { get; set; }
        public required decimal Price { get; set; }
        public bool? IsActive { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
