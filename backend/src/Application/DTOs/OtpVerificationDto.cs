namespace QorstackReportService.Application.DTOs
{
    public class OtpVerificationDto
    {
        public required Guid Id { get; set; }
        public required string Email { get; set; }
        public required string OtpCode { get; set; }
        public required string RefCode { get; set; }
        public required string Type { get; set; }
        public required DateTime ExpiresAt { get; set; }
        public bool? IsVerified { get; set; }
        public DateTime? VerifiedAt { get; set; }
        public string? VerificationToken { get; set; }
        public bool? IsConsumed { get; set; }
        public DateTime? CreatedDatetime { get; set; }
    }
}
