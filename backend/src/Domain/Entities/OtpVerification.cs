using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

public partial class OtpVerification
{
    public Guid Id { get; set; }

    public string Email { get; set; } = null!;

    public string OtpCode { get; set; } = null!;

    public string RefCode { get; set; } = null!;

    public string Type { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public bool? IsVerified { get; set; }

    public DateTime? VerifiedAt { get; set; }

    public string? VerificationToken { get; set; }

    public bool? IsConsumed { get; set; }

    public DateTime? CreatedDatetime { get; set; }
}
