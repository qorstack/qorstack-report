namespace QorstackReportService.Application.Auth.Models;

public record ChangePasswordRequest(string OldPassword, string NewPassword);
