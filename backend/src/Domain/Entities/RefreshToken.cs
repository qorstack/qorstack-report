using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

public partial class RefreshToken
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string Token { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public string? CreatedIp { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime? CreatedDatetime { get; set; }

    public virtual User User { get; set; } = null!;
}
