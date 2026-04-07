namespace QorstackReportService.Application.DTOs
{
    public class ProjectInvitationDto
    {
        public required Guid Id { get; set; }
        public required Guid ProjectId { get; set; }
        public required string Email { get; set; }
        public required string Role { get; set; }
        public required string Token { get; set; }
        public required Guid InvitedByUserId { get; set; }
        public required string Status { get; set; }
        public required DateTime ExpiresAt { get; set; }
        public DateTime? AcceptedAt { get; set; }
        public Guid? AcceptedByUserId { get; set; }
        public DateTime? DeclinedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string? CreatedBy { get; set; }
        public required DateTime CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
