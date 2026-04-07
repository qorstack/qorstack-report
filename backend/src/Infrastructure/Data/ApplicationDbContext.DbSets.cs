using Microsoft.EntityFrameworkCore;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data;

public partial class ApplicationDbContext
{
    public DbSet<AnalyticsDailyStat> AnalyticsDailyStats { get; set; }
    public DbSet<AnalyticsHourlyStat> AnalyticsHourlyStats { get; set; }
    public DbSet<AnalyticsTemplateStat> AnalyticsTemplateStats { get; set; }
    public DbSet<ApiKey> ApiKeys { get; set; }
    public DbSet<Font> Fonts { get; set; }
    public DbSet<FontOwnership> FontOwnerships { get; set; }
    public DbSet<MigrationHistory> MigrationHistories { get; set; }
    public DbSet<OtpVerification> OtpVerifications { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<ProjectInvitation> ProjectInvitations { get; set; }
    public DbSet<ProjectMember> ProjectMembers { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<ReportJob> ReportJobs { get; set; }
    public DbSet<Template> Templates { get; set; }
    public DbSet<TemplateVersion> TemplateVersions { get; set; }
    public DbSet<User> Users { get; set; }

    // SaaS billing & subscription tables
    public DbSet<Plan> Plans { get; set; }
    public DbSet<Subscription> Subscriptions { get; set; }
    public DbSet<SubscriptionUsage> SubscriptionUsages { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<CreditTransaction> CreditTransactions { get; set; }
}
