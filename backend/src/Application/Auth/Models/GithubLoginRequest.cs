namespace QorstackReportService.Application.Auth.Models;

public record GithubLoginRequest(string GithubId, string Email, string Name, string AvatarUrl);
