namespace QorstackReportService.Application.Auth.Models;

public record RegisterResponse(Guid Id, string Email, string? FirstName, string? LastName, string Status, string RefCode);
