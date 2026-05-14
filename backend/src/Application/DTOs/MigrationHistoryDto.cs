namespace QorstackReportService.Application.DTOs
{
    public class MigrationHistoryDto
    {
        public required int Id { get; set; }
        public required string FileName { get; set; }
        public required DateTime AppliedAt { get; set; }
        public required string AppliedBy { get; set; }
    }
}
