namespace QorstackReportService.Application.DTOs
{
    public class UserDto
    {
        public required Guid Id { get; set; }
        public required string Email { get; set; }
        public string? PasswordHash { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? ProfileImageUrl { get; set; }
        public string? GoogleId { get; set; }
        public string? GithubId { get; set; }
        public string? GitlabId { get; set; }
        public required int CreditBalance { get; set; }
        public string? Status { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
