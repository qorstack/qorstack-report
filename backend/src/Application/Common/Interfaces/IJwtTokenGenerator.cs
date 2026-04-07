using System;
using System.Security.Claims;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    ClaimsPrincipal GetPrincipalFromExpiredToken(string token);
}
