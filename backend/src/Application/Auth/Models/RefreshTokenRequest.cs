namespace QorstackReportService.Application.Auth.Models;

public record RefreshTokenRequest(string AccessToken, string RefreshToken);
