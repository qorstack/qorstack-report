using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// Email invitations for joining a project. Supports users who do not yet have an account.
/// </summary>
public partial class ProjectInvitation
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public string Email { get; set; } = null!;

    public string Role { get; set; } = null!;

    public string Token { get; set; } = null!;

    public Guid InvitedByUserId { get; set; }

    public string Status { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public DateTime? AcceptedAt { get; set; }

    public Guid? AcceptedByUserId { get; set; }

    public DateTime? DeclinedAt { get; set; }

    public DateTime? CancelledAt { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime CreatedDatetime { get; set; }

    public string? UpdatedBy { get; set; }

    public DateTime? UpdatedDatetime { get; set; }

    public virtual User? AcceptedByUser { get; set; }

    public virtual User InvitedByUser { get; set; } = null!;

    public virtual Project Project { get; set; } = null!;
}
