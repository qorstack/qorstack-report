namespace QorstackReportService.Application.DTOs
{
    public class RefreshTokenDto
    {
        public required Guid Id { get; set; }
        public required Guid UserId { get; set; }
        public required string Token { get; set; }
        public required DateTime ExpiresAt { get; set; }
        public DateTime? RevokedAt { get; set; }
        public string? CreatedIp { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedDatetime { get; set; }
    }
}
