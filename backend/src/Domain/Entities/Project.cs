using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// Groups templates and API keys under a named project.
/// </summary>
public partial class Project : BaseAuditableEntity
{
    public Guid Id { get; set; }

    /// <summary>
    /// User who owns this project.
    /// </summary>
    public Guid UserId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public string? Status { get; set; }

    public virtual ICollection<ApiKey> ApiKeys { get; set; } = new List<ApiKey>();

    public virtual ICollection<FontOwnership> FontOwnerships { get; set; } = new List<FontOwnership>();

    public virtual ICollection<ProjectInvitation> ProjectInvitations { get; set; } = new List<ProjectInvitation>();

    public virtual ICollection<ProjectMember> ProjectMembers { get; set; } = new List<ProjectMember>();

    public virtual ICollection<Template> Templates { get; set; } = new List<Template>();

    public virtual User User { get; set; } = null!;
}
