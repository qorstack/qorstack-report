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

    /// <summary>
    /// Email address used for login and communication.
    /// </summary>
    public string Email { get; set; } = null!;

    /// <summary>
    /// Hashed password (null for OAuth-only accounts).
    /// </summary>
    public string? PasswordHash { get; set; }

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? PhoneNumber { get; set; }

    public string? ProfileImageUrl { get; set; }

    /// <summary>
    /// Google OAuth user ID (if linked).
    /// </summary>
    public string? GoogleId { get; set; }

    /// <summary>
    /// GitHub OAuth user ID (if linked).
    /// </summary>
    public string? GithubId { get; set; }

    /// <summary>
    /// GitLab OAuth user ID (if linked).
    /// </summary>
    public string? GitlabId { get; set; }

    /// <summary>
    /// Account status: active, inactive, suspended, pending_verification.
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// Remaining credit balance for pay-per-use billing (SaaS only).
    /// Always 0 in self-hosted deployments. Updated via database trigger in SaaS.
    /// </summary>
    public int CreditBalance { get; set; }

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

    // SaaS billing navigation properties
    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public virtual ICollection<CreditTransaction> CreditTransactions { get; set; } = new List<CreditTransaction>();
}
