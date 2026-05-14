using Microsoft.AspNetCore.Identity;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Auth.Common;

/// <summary>
/// Password Hasher Service - wraps ASP.NET Identity's password hasher.
/// Stateless service.
/// </summary>
public class PasswordHasherService
{
    private readonly IPasswordHasher<User> _passwordHasher;

    public PasswordHasherService()
    {
        _passwordHasher = new PasswordHasher<User>();
    }

    public string HashPassword(User user, string password)
    {
        return _passwordHasher.HashPassword(user, password);
    }

    public bool VerifyPassword(User user, string hashedPassword, string providedPassword)
    {
        var result = _passwordHasher.VerifyHashedPassword(user, hashedPassword, providedPassword);
        return result != PasswordVerificationResult.Failed;
    }
}
