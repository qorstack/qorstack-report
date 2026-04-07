namespace QorstackReportService.Application.Auth.Models;

public record VerifyOtpRequest(string Email, string Otp, string Type);
