namespace QorstackReportService.Application.DTOs
{
    public class ReportJobDto
    {
        public required Guid Id { get; set; }
        public required Guid UserId { get; set; }
        public Guid? ApiKeyId { get; set; }
        public Guid? SubscriptionId { get; set; }
        public string? SourceType { get; set; }
        public Guid? TemplateVersionId { get; set; }
        public string? ChargedType { get; set; }
        public string? Status { get; set; }
        public string? RequestData { get; set; }
        public string? OutputFilePath { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? FinishedAt { get; set; }
        public long? DurationMs { get; set; }
        public long? FileSizeBytes { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
