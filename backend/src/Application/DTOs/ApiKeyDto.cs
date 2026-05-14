namespace QorstackReportService.Application.DTOs
{
    public class ApiKeyDto
    {
        public required Guid Id { get; set; }
        public required Guid UserId { get; set; }
        public Guid? ProjectId { get; set; }
        public required string XApiKey { get; set; }
        public string? Name { get; set; }
        public bool? IsActive { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
