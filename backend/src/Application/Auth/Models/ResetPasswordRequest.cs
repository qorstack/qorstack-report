namespace QorstackReportService.Application.Auth.Models;

public record ResetPasswordRequest(string VerificationToken, string NewPassword);
