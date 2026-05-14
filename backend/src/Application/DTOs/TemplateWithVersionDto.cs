namespace QorstackReportService.Application.DTOs
{
    public class TemplateWithVersionDto
    {
        public required Guid Id { get; set; }
        public required Guid UserId { get; set; }
        public required string TemplateKey { get; set; }
        public required string Name { get; set; }
        public string? PreviewFilePath { get; set; }
        public TemplateVersionDto? ActiveVersion { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
