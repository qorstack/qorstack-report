using System;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Common.Services;

/// <summary>
/// OTP Service - handles OTP generation and verification.
/// Does NOT manage transactions - caller (Handler) is responsible for transaction management.
/// </summary>
public class OtpService : IOtpService
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<OtpService> _logger;

    public OtpService(IApplicationDbContext context, IEmailService emailService, ILogger<OtpService> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<string> GenerateOtp(string email, string type, CancellationToken cancellationToken = default)
    {
        var existingOtps = await _context.OtpVerifications
            .Where(x => x.Email == email && x.Type == type && x.IsVerified != true)
            .ToListAsync(cancellationToken);

        if (existingOtps.Any())
        {
            _context.OtpVerifications.RemoveRange(existingOtps);
            _logger.LogInformation("Deleted {Count} existing OTPs for {Email}", existingOtps.Count, email);
        }

        var otp = RandomNumberGenerator.GetInt32(0, 999999).ToString("D6");
        var refCode = System.Security.Cryptography.RandomNumberGenerator.GetString("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

        var verification = new OtpVerification
        {
            Id = Guid.NewGuid(),
            Email = email,
            OtpCode = otp,
            RefCode = refCode,
            Type = type,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsVerified = false,
            IsConsumed = false,
            CreatedDatetime = DateTime.UtcNow
        };

        _context.OtpVerifications.Add(verification);

        await _emailService.SendEmailAsync(email, "Your OTP Code", $"Your OTP is {otp} (Ref: {refCode})");

        _logger.LogInformation("Generated new OTP for {Email}, RefCode: {RefCode}", email, refCode);

        return refCode;
    }

    public async Task<string?> VerifyOtp(string email, string otp, string type, CancellationToken cancellationToken = default)
    {
        var verification = await _context.OtpVerifications.FirstOrDefaultAsync(v => v.Email == email &&  v.OtpCode == otp && v.Type == type && v.IsVerified != true, cancellationToken);

        if (verification == null)
        {
            _logger.LogWarning("OTP verification failed for {Email}", email);
            return null;
        }

        if (verification.ExpiresAt < DateTime.UtcNow)
        {
            _logger.LogWarning("OTP verification failed for {Email} - OTP expired", email);
            throw new ValidationException("OTP_EXPIRED", "OTP code has expired");
        }

        verification.IsVerified = true;
        verification.VerifiedAt = DateTime.UtcNow;
        verification.VerificationToken = Guid.NewGuid().ToString();

        // Handle IsConsumed for REGISTER
        if (type == "REGISTER")
        {
            verification.IsConsumed = true;
        }

        _logger.LogInformation("OTP verified for {Email} (Type: {Type})", email, type);
        return verification.VerificationToken;
    }
}
