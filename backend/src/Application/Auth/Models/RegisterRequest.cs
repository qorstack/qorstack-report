namespace QorstackReportService.Application.Auth.Models;

public record RegisterRequest(string Email, string Password, string FirstName, string LastName);
