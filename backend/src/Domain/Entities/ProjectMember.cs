using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// Project membership with role-based access control.
/// </summary>
public partial class ProjectMember
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public Guid UserId { get; set; }

    /// <summary>
    /// Role: owner = project creator, admin = manager, editor = contributor.
    /// </summary>
    public string Role { get; set; } = null!;

    public Guid? InvitedByUserId { get; set; }

    public DateTime? JoinedAt { get; set; }

    public bool IsActive { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime CreatedDatetime { get; set; }

    public string? UpdatedBy { get; set; }

    public DateTime? UpdatedDatetime { get; set; }

    public virtual User? InvitedByUser { get; set; }

    public virtual Project Project { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
