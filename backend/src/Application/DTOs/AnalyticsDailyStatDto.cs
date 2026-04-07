namespace QorstackReportService.Application.DTOs
{
    public class AnalyticsDailyStatDto
    {
        public required Guid Id { get; set; }
        public required Guid UserId { get; set; }
        public Guid? ProjectId { get; set; }
        public required DateOnly StatDate { get; set; }
        public required int TotalCount { get; set; }
        public required int SuccessCount { get; set; }
        public required int FailedCount { get; set; }
        public required long TotalDurationMs { get; set; }
        public required long TotalFileSizeBytes { get; set; }
    }
}
