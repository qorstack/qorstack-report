namespace QorstackReportService.Application.Auth.Models;

public record GitlabLoginRequest(string GitlabId, string Email, string Name, string AvatarUrl);
