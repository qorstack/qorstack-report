using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// Stores user accounts and authentication data.
/// </summary>
public partial class User : BaseAuditableEntity
{
    public Guid Id { get; set; }

    public string Email { get; set; } = null!;

    public string? PasswordHash { get; set; }

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? PhoneNumber { get; set; }

    public string? ProfileImageUrl { get; set; }

    public string? GoogleId { get; set; }

    public string? GithubId { get; set; }

    public string? GitlabId { get; set; }

    /// <summary>
    /// Account status: active, inactive, suspended, pending_verification.
    /// </summary>
    public string? Status { get; set; }

    public virtual ICollection<AnalyticsDailyStat> AnalyticsDailyStats { get; set; } = new List<AnalyticsDailyStat>();

    public virtual ICollection<AnalyticsHourlyStat> AnalyticsHourlyStats { get; set; } = new List<AnalyticsHourlyStat>();

    public virtual ICollection<AnalyticsTemplateStat> AnalyticsTemplateStats { get; set; } = new List<AnalyticsTemplateStat>();

    public virtual ICollection<ApiKey> ApiKeys { get; set; } = new List<ApiKey>();

    public virtual ICollection<FontOwnership> FontOwnerships { get; set; } = new List<FontOwnership>();

    public virtual ICollection<ProjectInvitation> ProjectInvitationAcceptedByUsers { get; set; } = new List<ProjectInvitation>();

    public virtual ICollection<ProjectInvitation> ProjectInvitationInvitedByUsers { get; set; } = new List<ProjectInvitation>();

    public virtual ICollection<ProjectMember> ProjectMemberInvitedByUsers { get; set; } = new List<ProjectMember>();

    public virtual ICollection<ProjectMember> ProjectMemberUsers { get; set; } = new List<ProjectMember>();

    public virtual ICollection<Project> Projects { get; set; } = new List<Project>();

    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public virtual ICollection<ReportJob> ReportJobs { get; set; } = new List<ReportJob>();

    public virtual ICollection<Template> Templates { get; set; } = new List<Template>();
}
