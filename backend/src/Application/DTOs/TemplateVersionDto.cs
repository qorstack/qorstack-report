namespace QorstackReportService.Application.DTOs
{
    public class TemplateVersionDto
    {
        public required Guid Id { get; set; }
        public required Guid TemplateId { get; set; }
        public required int Version { get; set; }
        public required string FilePath { get; set; }
        public string? Status { get; set; }
        public string? PreviewFilePath { get; set; }
        public string? SandboxPayload { get; set; }
        public string? SandboxFilePath { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
