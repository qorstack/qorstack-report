namespace QorstackReportService.Application.Fonts.Models;

public class FontDetailDto
{
    public required Guid Id { get; set; }
    public required string Name { get; set; }
    public required string FamilyName { get; set; }
    public required string SubFamilyName { get; set; }
    public required short Weight { get; set; }
    public required bool IsItalic { get; set; }
    public required string FileFormat { get; set; }
    public required long FileSizeBytes { get; set; }
    public required bool IsSystemFont { get; set; }
    public required string AccessType { get; set; }
    public required DateTime CreatedDatetime { get; set; }
    public Guid? OwnershipId { get; set; }
    public string? LicenseNote { get; set; }
    public string? DownloadUrl { get; set; }
}
