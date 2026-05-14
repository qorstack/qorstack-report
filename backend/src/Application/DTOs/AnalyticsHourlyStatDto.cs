namespace QorstackReportService.Application.DTOs
{
    public class AnalyticsHourlyStatDto
    {
        public required Guid Id { get; set; }
        public required Guid UserId { get; set; }
        public required DateOnly StatDate { get; set; }
        public required short StatHour { get; set; }
        public required int TotalCount { get; set; }
    }
}
