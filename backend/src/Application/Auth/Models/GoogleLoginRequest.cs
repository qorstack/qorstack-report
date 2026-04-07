namespace QorstackReportService.Application.Auth.Models;

public record GoogleLoginRequest(string GoogleId, string Email, string FirstName, string LastName, string PhotoUrl);
