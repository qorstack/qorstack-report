namespace QorstackReportService.Application.DTOs
{
    public class FontDto
    {
        public required Guid Id { get; set; }
        public required string Name { get; set; }
        public required string FamilyName { get; set; }
        public required string SubFamilyName { get; set; }
        public required short Weight { get; set; }
        public required bool IsItalic { get; set; }
        public required string FileFormat { get; set; }
        public required long FileSizeBytes { get; set; }
        public required string FileHash { get; set; }
        public string? StorageBucket { get; set; }
        public required string StorageKey { get; set; }
        public string? PreviewImageKey { get; set; }
        public required string SyncSource { get; set; }
        public required bool IsSystemFont { get; set; }
        public required bool IsActive { get; set; }
        public string? Description { get; set; }
        public string? CreatedBy { get; set; }
        public required DateTime CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
