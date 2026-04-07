namespace QorstackReportService.Application.DTOs
{
    public class FontOwnershipDto
    {
        public required Guid Id { get; set; }
        public required Guid FontId { get; set; }
        public required Guid ProjectId { get; set; }
        public required Guid UploadedByUserId { get; set; }
        public string? LicenseNote { get; set; }
        public required bool IsActive { get; set; }
        public string? CreatedBy { get; set; }
        public required DateTime CreatedDatetime { get; set; }
    }
}
