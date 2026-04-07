namespace QorstackReportService.Application.DTOs
{
    public class ProjectMemberDto
    {
        public required Guid Id { get; set; }
        public required Guid ProjectId { get; set; }
        public required Guid UserId { get; set; }
        public required string Role { get; set; }
        public Guid? InvitedByUserId { get; set; }
        public DateTime? JoinedAt { get; set; }
        public required bool IsActive { get; set; }
        public string? CreatedBy { get; set; }
        public required DateTime CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
