using QorstackReportService.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace QorstackReportService.Application.Common.Interfaces;

public partial interface IApplicationDbContext
{
    DbSet<AnalyticsDailyStat> AnalyticsDailyStats { get; set; }
    DbSet<AnalyticsHourlyStat> AnalyticsHourlyStats { get; set; }
    DbSet<AnalyticsTemplateStat> AnalyticsTemplateStats { get; set; }
    DbSet<ApiKey> ApiKeys { get; set; }
    DbSet<Font> Fonts { get; set; }
    DbSet<FontOwnership> FontOwnerships { get; set; }
    DbSet<MigrationHistory> MigrationHistories { get; set; }
    DbSet<OtpVerification> OtpVerifications { get; set; }
    DbSet<Project> Projects { get; set; }
    DbSet<ProjectInvitation> ProjectInvitations { get; set; }
    DbSet<ProjectMember> ProjectMembers { get; set; }
    DbSet<RefreshToken> RefreshTokens { get; set; }
    DbSet<ReportJob> ReportJobs { get; set; }
    DbSet<Template> Templates { get; set; }
    DbSet<TemplateVersion> TemplateVersions { get; set; }
    DbSet<User> Users { get; set; }

    // SaaS billing & subscription tables
    DbSet<Plan> Plans { get; set; }
    DbSet<Subscription> Subscriptions { get; set; }
    DbSet<SubscriptionUsage> SubscriptionUsages { get; set; }
    DbSet<Payment> Payments { get; set; }
    DbSet<CreditTransaction> CreditTransactions { get; set; }
}
